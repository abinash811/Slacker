"""Everything that talks to the Slack Web API (posting/updating ticket
messages, resolving which channel a ticket goes to, building Block Kit
payloads). Called by both the REST API (dashboard -> Slack push) and the
Slack Bolt handlers (Slack -> dashboard) so the message layout can never
drift between the two entry points.

No ticket business rules live here — only Slack I/O and presentation.
"""

import logging
import time

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.category import Category
from app.models.custom_field import CustomFieldDefinition, CustomFieldType
from app.models.enums import TicketPriority
from app.models.sla import SLAPolicy
from app.models.slack import SlackChannel
from app.models.team import Team
from app.models.ticket import Ticket

logger = logging.getLogger(__name__)

_STATUS_LABELS = {
    "open": "Open",
    "in_progress": "In Progress",
    "pending": "Pending",
    "resolved": "Resolved",
    "closed": "Closed",
}
_PRIORITY_EMOJI = {"low": "🔵", "medium": "🟡", "high": "🟠", "urgent": "🔴"}


def get_client() -> WebClient:
    return WebClient(token=get_settings().slack_bot_token)


def _call_with_retry(fn, **kwargs):
    """Slack allows short bursts but sustained overage returns HTTP 429
    with a Retry-After header — honor it once, then give up loudly rather
    than retrying forever and masking a real failure.
    """
    try:
        return fn(**kwargs)
    except SlackApiError as e:
        if e.response is not None and e.response.status_code == 429:
            retry_after = int(e.response.headers.get("Retry-After", "1"))
            logger.warning("Slack rate limited, retrying after %ss", retry_after)
            time.sleep(retry_after)
            return fn(**kwargs)
        raise


def resolve_channel_for_team(db: Session, team_id: int) -> str:
    """Product decision: mostly one shared channel, with specific teams
    overridden (see docs/ARCHITECTURE.md section 2 channel routing).
    """
    mapping = db.execute(select(SlackChannel).where(SlackChannel.team_id == team_id)).scalar_one_or_none()
    if mapping is not None:
        return mapping.slack_channel_id

    default = db.execute(select(SlackChannel).where(SlackChannel.is_default.is_(True))).scalar_one_or_none()
    if default is not None:
        return default.slack_channel_id

    settings = get_settings()
    if settings.slack_default_channel_id:
        return settings.slack_default_channel_id

    raise ValueError("No Slack channel configured (no team mapping and no default channel)")


def build_ticket_blocks(ticket: Ticket) -> list[dict]:
    owner_line = f"<@{ticket.owner.slack_user_id}>" if ticket.owner and ticket.owner.slack_user_id else (
        ticket.owner.name if ticket.owner else "Unassigned"
    )
    priority_emoji = _PRIORITY_EMOJI.get(ticket.priority.value, "")
    status_label = _STATUS_LABELS.get(ticket.status.value, ticket.status.value)

    fields = [
        {"type": "mrkdwn", "text": f"*Customer:*\n{ticket.customer}"},
        {"type": "mrkdwn", "text": f"*Category:*\n{ticket.category.name}"},
        {"type": "mrkdwn", "text": f"*Team:*\n{ticket.team.name}"},
        {"type": "mrkdwn", "text": f"*Priority:*\n{priority_emoji} {ticket.priority.value.title()}"},
        {"type": "mrkdwn", "text": f"*SLA:*\n{ticket.sla_policy.duration_hours} hours"},
        {"type": "mrkdwn", "text": f"*Owner:*\n{owner_line}"},
    ]
    # Slack section blocks cap out at 10 fields; fine for the fixed 6 plus
    # a handful of custom fields, but this will need pagination/overflow
    # handling if the custom field list grows much larger.
    for value in ticket.custom_field_values:
        fields.append({"type": "mrkdwn", "text": f"*{value.field_definition.label}:*\n{value.value}"})

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Ticket #{ticket.ticket_number} — {ticket.title}*\n{ticket.description}",
            },
        },
        {"type": "section", "fields": fields},
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"Status: *{status_label}*"}],
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Assign"},
                    "action_id": "ticket_assign",
                    "value": str(ticket.id),
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Status"},
                    "action_id": "ticket_status",
                    "value": str(ticket.id),
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Priority"},
                    "action_id": "ticket_priority",
                    "value": str(ticket.id),
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Resolve"},
                    "style": "primary",
                    "action_id": "ticket_resolve",
                    "value": str(ticket.id),
                    "confirm": {
                        "title": {"type": "plain_text", "text": "Resolve ticket?"},
                        "text": {"type": "plain_text", "text": f"Mark ticket #{ticket.ticket_number} as resolved."},
                        "confirm": {"type": "plain_text", "text": "Resolve"},
                        "deny": {"type": "plain_text", "text": "Cancel"},
                    },
                },
            ],
        },
    ]
    return blocks


def fallback_text(ticket: Ticket) -> str:
    return f"Ticket #{ticket.ticket_number} — {ticket.title} ({ticket.status.value})"


def post_ticket_message(db: Session, ticket: Ticket) -> Ticket:
    channel_id = ticket.slack_channel_id or resolve_channel_for_team(db, ticket.team_id)
    client = get_client()
    response = _call_with_retry(
        client.chat_postMessage,
        channel=channel_id,
        blocks=build_ticket_blocks(ticket),
        text=fallback_text(ticket),
    )
    ticket.slack_channel_id = channel_id
    ticket.slack_message_ts = response["ts"]
    db.commit()
    db.refresh(ticket)
    return ticket


def update_ticket_message(ticket: Ticket) -> None:
    if not ticket.slack_channel_id or not ticket.slack_message_ts:
        return  # ticket was never pushed to Slack; nothing to update
    client = get_client()
    _call_with_retry(
        client.chat_update,
        channel=ticket.slack_channel_id,
        ts=ticket.slack_message_ts,
        blocks=build_ticket_blocks(ticket),
        text=fallback_text(ticket),
    )


def build_create_ticket_modal(db: Session) -> dict:
    """Workflow B (spec section 5): Slack -> dashboard ticket creation."""
    teams = db.execute(select(Team).order_by(Team.name)).scalars().all()
    categories = db.execute(
        select(Category).where(Category.is_archived.is_(False)).order_by(Category.name)
    ).scalars().all()
    sla_policies = db.execute(
        select(SLAPolicy).where(SLAPolicy.is_archived.is_(False)).order_by(SLAPolicy.duration_hours)
    ).scalars().all()
    custom_fields = db.execute(
        select(CustomFieldDefinition).where(CustomFieldDefinition.is_archived.is_(False)).order_by(CustomFieldDefinition.label)
    ).scalars().all()

    def option(text: str, value: str) -> dict:
        return {"text": {"type": "plain_text", "text": text}, "value": value}

    return {
        "type": "modal",
        "callback_id": "create_ticket_modal",
        "title": {"type": "plain_text", "text": "Create Ticket"},
        "submit": {"type": "plain_text", "text": "Create"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "title",
                "label": {"type": "plain_text", "text": "Title"},
                "element": {"type": "plain_text_input", "action_id": "value"},
            },
            {
                "type": "input",
                "block_id": "description",
                "label": {"type": "plain_text", "text": "Description"},
                "element": {"type": "plain_text_input", "action_id": "value", "multiline": True},
            },
            {
                "type": "input",
                "block_id": "customer",
                "label": {"type": "plain_text", "text": "Customer"},
                "element": {"type": "plain_text_input", "action_id": "value"},
            },
            {
                "type": "input",
                "block_id": "category",
                "label": {"type": "plain_text", "text": "Category"},
                "element": {
                    "type": "static_select",
                    "action_id": "value",
                    "options": [option(c.name, str(c.id)) for c in categories],
                },
            },
            {
                "type": "input",
                "block_id": "team",
                "label": {"type": "plain_text", "text": "Team"},
                "element": {
                    "type": "static_select",
                    "action_id": "value",
                    "options": [option(t.name, str(t.id)) for t in teams],
                },
            },
            {
                "type": "input",
                "block_id": "priority",
                "label": {"type": "plain_text", "text": "Priority"},
                "element": {
                    "type": "static_select",
                    "action_id": "value",
                    "initial_option": option("Medium", "medium"),
                    "options": [option(p.value.title(), p.value) for p in TicketPriority],
                },
            },
            {
                "type": "input",
                "block_id": "sla_policy",
                "label": {"type": "plain_text", "text": "SLA"},
                "element": {
                    "type": "static_select",
                    "action_id": "value",
                    "options": [option(f"{s.name}", str(s.id)) for s in sla_policies],
                },
            },
        ]
        + [_build_custom_field_block(field) for field in custom_fields],
    }


def _build_custom_field_block(field: CustomFieldDefinition) -> dict:
    """block_id encodes the field's id (`custom_field_<id>`) so the
    `view_submission` handler can map the answer back to the right
    CustomFieldDefinition without a second lookup.
    """
    block_id = f"custom_field_{field.id}"
    if field.field_type == CustomFieldType.DROPDOWN:
        element = {
            "type": "static_select",
            "action_id": "value",
            "options": [
                {"text": {"type": "plain_text", "text": opt}, "value": opt} for opt in (field.options or [])
            ],
        }
    else:
        element = {"type": "plain_text_input", "action_id": "value"}
    return {
        "type": "input",
        "block_id": block_id,
        "label": {"type": "plain_text", "text": field.label[:75]},  # Slack label limit
        "element": element,
        "optional": True,
    }


def build_assign_modal(ticket: Ticket) -> dict:
    return {
        "type": "modal",
        "callback_id": "assign_ticket_modal",
        "private_metadata": str(ticket.id),
        "title": {"type": "plain_text", "text": f"Assign #{ticket.ticket_number}"},
        "submit": {"type": "plain_text", "text": "Assign"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "owner",
                "label": {"type": "plain_text", "text": "Assign to"},
                "element": {"type": "users_select", "action_id": "value"},
            }
        ],
    }


def build_status_modal(ticket: Ticket) -> dict:
    return {
        "type": "modal",
        "callback_id": "status_modal",
        "private_metadata": str(ticket.id),
        "title": {"type": "plain_text", "text": f"Status #{ticket.ticket_number}"},
        "submit": {"type": "plain_text", "text": "Update"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "status",
                "label": {"type": "plain_text", "text": "Status"},
                "element": {
                    "type": "static_select",
                    "action_id": "value",
                    "initial_option": {
                        "text": {"type": "plain_text", "text": _STATUS_LABELS[ticket.status.value]},
                        "value": ticket.status.value,
                    },
                    "options": [
                        {"text": {"type": "plain_text", "text": label}, "value": value}
                        for value, label in _STATUS_LABELS.items()
                    ],
                },
            }
        ],
    }


def build_priority_modal(ticket: Ticket) -> dict:
    return {
        "type": "modal",
        "callback_id": "priority_modal",
        "private_metadata": str(ticket.id),
        "title": {"type": "plain_text", "text": f"Priority #{ticket.ticket_number}"},
        "submit": {"type": "plain_text", "text": "Update"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "priority",
                "label": {"type": "plain_text", "text": "Priority"},
                "element": {
                    "type": "static_select",
                    "action_id": "value",
                    "initial_option": {
                        "text": {"type": "plain_text", "text": ticket.priority.value.title()},
                        "value": ticket.priority.value,
                    },
                    "options": [
                        {"text": {"type": "plain_text", "text": p.value.title()}, "value": p.value}
                        for p in TicketPriority
                    ],
                },
            }
        ],
    }


def build_permalink(ticket: Ticket) -> str | None:
    domain = get_settings().slack_workspace_domain
    if not domain or not ticket.slack_channel_id or not ticket.slack_message_ts:
        return None
    ts_compact = ticket.slack_message_ts.replace(".", "")
    return f"https://{domain}.slack.com/archives/{ticket.slack_channel_id}/p{ts_compact}"
