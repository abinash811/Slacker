"""Everything that talks to the Slack Web API (posting/updating ticket
messages, resolving which channel a ticket goes to, building Block Kit
payloads). Called by both the REST API (dashboard -> Slack push) and the
Slack Bolt handlers (Slack -> dashboard) so the message layout can never
drift between the two entry points.

No ticket business rules live here — only Slack I/O and presentation.
"""

import logging
import time
from typing import Literal

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.category import Category
from app.models.custom_field import CustomFieldDefinition, CustomFieldType
from app.models.enums import TicketPriority
from app.models.slack import SlackChannel
from app.models.team import Team
from app.models.ticket import Ticket
from app.models.user import User

logger = logging.getLogger(__name__)

TicketChange = Literal["assigned", "status"]

_STATUS_LABELS = {
    "open": "Open",
    "in_progress": "In Progress",
    "pending": "Pending",
    "resolved": "Resolved",
    "closed": "Closed",
}
ONE_ISSUE_HINT = "One issue per ticket. For a related problem, click *Sub-issue*; for anything else, create a new ticket."

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
        {"type": "mrkdwn", "text": f"*Business name:*\n{ticket.customer}"},
        {"type": "mrkdwn", "text": f"*Category:*\n{ticket.category.name}"},
        {"type": "mrkdwn", "text": f"*Team:*\n{ticket.team.name}"},
        {"type": "mrkdwn", "text": f"*Priority:*\n{priority_emoji} {ticket.priority.value.title()}"},
        {"type": "mrkdwn", "text": f"*SLA:*\n{ticket.sla_hours} hours"},
        {"type": "mrkdwn", "text": f"*Owner:*\n{owner_line}"},
    ]
    if ticket.support_assignee:
        support_line = (
            f"<@{ticket.support_assignee.slack_user_id}>"
            if ticket.support_assignee.slack_user_id
            else ticket.support_assignee.name
        )
        fields.append({"type": "mrkdwn", "text": f"*Support Owner:*\n{support_line}"})
    if ticket.business_id:
        fields.append({"type": "mrkdwn", "text": f"*Business ID:*\n{ticket.business_id}"})
    if ticket.mobile_number:
        fields.append({"type": "mrkdwn", "text": f"*Mobile number:*\n{ticket.mobile_number}"})
    if ticket.doctor_name:
        fields.append({"type": "mrkdwn", "text": f"*Doctor name:*\n{ticket.doctor_name}"})
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
            "elements": [{"type": "mrkdwn", "text": _status_context(ticket, status_label)}],
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
                    "text": {"type": "plain_text", "text": "Team"},
                    "action_id": "ticket_team",
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
                    "text": {"type": "plain_text", "text": "Sub-issue"},
                    "action_id": "ticket_sub_issue",
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
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": ONE_ISSUE_HINT}],
        },
    ]
    if ticket.parent is not None:
        blocks.insert(0, {"type": "context", "elements": [{"type": "mrkdwn", "text": _parent_line(ticket.parent)}]})
    return blocks


def _parent_line(parent: Ticket) -> str:
    link = build_permalink(parent)
    ref = f"<{link}|#{parent.ticket_number} — {parent.title}>" if link else f"#{parent.ticket_number} — {parent.title}"
    return f"↳ Sub-issue of {ref}"


def _status_context(ticket: Ticket, status_label: str) -> str:
    text = f"Status: *{status_label}*"
    if ticket.sub_issues:
        done = sum(1 for s in ticket.sub_issues if s.status.value in ("resolved", "closed"))
        text += f"  ·  Sub-issues: {done} of {len(ticket.sub_issues)} done"
    return text


def fallback_text(ticket: Ticket) -> str:
    return f"Ticket #{ticket.ticket_number} — {ticket.title} ({ticket.status.value})"


def link_slack_user(db: Session, user: User | None) -> str | None:
    """Returns the user's Slack id, finding it by email the first time.
    People added in the dashboard have no Slack id until they act in
    Slack; without one we can only print their name, and Slack notifies
    nobody. Needs the `users:read.email` scope.
    """
    if user is None:
        return None
    if user.slack_user_id:
        return user.slack_user_id
    if not get_settings().slack_bot_token or user.email.endswith("@slack.local"):
        return None
    try:
        slack_user_id = get_client().users_lookupByEmail(email=user.email)["user"]["id"]
    except SlackApiError as e:
        logger.info("No Slack account found for %s: %s", user.email, e.response.get("error") if e.response else e)
        return None
    user.slack_user_id = slack_user_id
    try:
        db.commit()
    except IntegrityError:
        # Another row already holds this Slack id (e.g. created from Slack
        # under a different email) — leave the link to an admin.
        db.rollback()
        logger.warning("Slack id %s already linked to another user; not linking %s", slack_user_id, user.email)
        return None
    return slack_user_id


def _link_ticket_people(db: Session, ticket: Ticket) -> None:
    link_slack_user(db, ticket.owner)
    link_slack_user(db, ticket.support_assignee)


def _mention(user: User | None) -> str | None:
    if user is None:
        return None
    return f"<@{user.slack_user_id}>" if user.slack_user_id else user.name


def assignment_note(ticket: Ticket, actor: User) -> str:
    if ticket.owner is None:
        return f"Ticket unassigned by {actor.name}."
    if ticket.owner.id == actor.id:
        return f"{_mention(ticket.owner)} picked up this ticket."
    return f"{_mention(ticket.owner)}, you've been assigned this ticket by {actor.name}."


def status_note(ticket: Ticket, actor: User) -> str:
    label = _STATUS_LABELS.get(ticket.status.value, ticket.status.value)
    note = f"Status changed to *{label}* by {actor.name}."
    if ticket.owner is not None and ticket.owner.id != actor.id:
        note += f" cc {_mention(ticket.owner)}"
    return note


def notify_ticket_change(db: Session, ticket: Ticket, actor: User, change: TicketChange | None = None) -> None:
    """Refreshes the ticket message and, for an assignment or status
    change, posts a thread reply about it.

    Slack never notifies anyone about an edited message, so the edit alone
    is silent. The reply is a new message: people it @mentions get a
    notification, and everyone following the thread sees it in Activity.
    """
    if not ticket.slack_channel_id or not ticket.slack_message_ts:
        return  # ticket was never pushed to Slack
    _link_ticket_people(db, ticket)  # before writing, so mentions resolve
    update_ticket_message(ticket)
    if change == "status" and ticket.parent is not None:
        try:
            update_ticket_message(ticket.parent)  # its "Sub-issues: 1 of 2 done" line
        except SlackApiError:
            logger.exception("Failed to refresh parent of ticket %s", ticket.id)
    if change is None:
        return
    note = assignment_note(ticket, actor) if change == "assigned" else status_note(ticket, actor)
    try:
        _call_with_retry(
            get_client().chat_postMessage,
            channel=ticket.slack_channel_id,
            thread_ts=ticket.slack_message_ts,
            text=note,
        )
    except SlackApiError:
        # The change itself is saved and the message updated; a missing
        # thread note shouldn't fail the request.
        logger.exception("Failed to post thread note for ticket %s", ticket.id)


def post_ticket_message(db: Session, ticket: Ticket) -> Ticket:
    _link_ticket_people(db, ticket)
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
    if ticket.parent is not None:
        _announce_sub_issue(ticket)
    return ticket


def _announce_sub_issue(sub_issue: Ticket) -> None:
    """Tells the parent ticket's thread about a new sub-issue (with a link
    to the sub-issue's own message) and refreshes the parent's progress
    line. Failures are logged: the sub-issue itself is already posted.
    """
    parent = sub_issue.parent
    if not parent.slack_channel_id or not parent.slack_message_ts:
        return
    client = get_client()
    try:
        link = client.chat_getPermalink(channel=sub_issue.slack_channel_id, message_ts=sub_issue.slack_message_ts)[
            "permalink"
        ]
    except SlackApiError:
        link = build_permalink(sub_issue)
    ref = f"<{link}|#{sub_issue.ticket_number} — {sub_issue.title}>" if link else f"#{sub_issue.ticket_number} — {sub_issue.title}"
    try:
        _call_with_retry(
            client.chat_postMessage,
            channel=parent.slack_channel_id,
            thread_ts=parent.slack_message_ts,
            text=f"Sub-issue created: {ref}",
        )
        update_ticket_message(parent)
    except SlackApiError:
        logger.exception("Failed to announce sub-issue %s on ticket %s", sub_issue.id, parent.id)


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


def _team_select_element(teams: list[Team], *, initial: Team | None) -> dict:
    element = {
        "type": "static_select",
        "action_id": "value",
        "options": [{"text": {"type": "plain_text", "text": t.name}, "value": str(t.id)} for t in teams],
    }
    if initial is not None:
        element["initial_option"] = {"text": {"type": "plain_text", "text": initial.name}, "value": str(initial.id)}
    return element


def build_create_ticket_modal(db: Session, parent: Ticket | None = None) -> dict:
    """Workflow B (spec section 5): Slack -> dashboard ticket creation.
    With `parent`, creates a sub-issue of it: the business details,
    category and team start as the parent's.
    """
    teams = db.execute(select(Team).order_by(Team.name)).scalars().all()
    default_team = parent.team if parent else next((t for t in teams if t.is_default), None)
    categories = db.execute(
        select(Category).where(Category.is_archived.is_(False)).order_by(Category.name)
    ).scalars().all()
    custom_fields = db.execute(
        select(CustomFieldDefinition).where(CustomFieldDefinition.is_archived.is_(False)).order_by(CustomFieldDefinition.label)
    ).scalars().all()

    def option(text: str, value: str) -> dict:
        return {"text": {"type": "plain_text", "text": text}, "value": value}

    def text_input(initial: str | None, **extra) -> dict:
        element = {"type": "plain_text_input", "action_id": "value", **extra}
        if initial:
            element["initial_value"] = initial
        return element

    category_select = {
        "type": "static_select",
        "action_id": "value",
        "options": [option(c.name, str(c.id)) for c in categories],
    }
    if parent is not None and any(c.id == parent.category_id for c in categories):
        category_select["initial_option"] = option(parent.category.name, str(parent.category_id))

    intro = (
        f"Sub-issue of *#{parent.ticket_number} — {parent.title}*. It gets its own message and thread."
        if parent
        else ONE_ISSUE_HINT.replace("click *Sub-issue*", "use *Sub-issue* on its ticket")
    )

    view = {
        "type": "modal",
        "callback_id": "create_ticket_modal",
        "title": {"type": "plain_text", "text": f"Sub-issue of #{parent.ticket_number}" if parent else "Create Ticket"},
        "submit": {"type": "plain_text", "text": "Create"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {"type": "context", "elements": [{"type": "mrkdwn", "text": intro}]},
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
                # Stored as `customer`; shown to people as "Business name".
                "block_id": "customer",
                "label": {"type": "plain_text", "text": "Business name"},
                "element": text_input(parent.customer if parent else None),
            },
            {
                "type": "input",
                "block_id": "business_id",
                "label": {"type": "plain_text", "text": "Business ID"},
                "element": text_input(parent.business_id if parent else None),
                "optional": True,
            },
            {
                "type": "input",
                "block_id": "mobile_number",
                "label": {"type": "plain_text", "text": "Mobile number"},
                "element": text_input(parent.mobile_number if parent else None),
                "optional": True,
            },
            {
                "type": "input",
                "block_id": "doctor_name",
                "label": {"type": "plain_text", "text": "Doctor name"},
                "element": text_input(parent.doctor_name if parent else None),
                "optional": True,
            },
            {
                "type": "input",
                "block_id": "category",
                "label": {"type": "plain_text", "text": "Category"},
                "element": category_select,
            },
            {
                "type": "input",
                "block_id": "team",
                "label": {"type": "plain_text", "text": "Team"},
                "element": _team_select_element(teams, initial=default_team),
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
        ]
        + [_build_custom_field_block(field) for field in custom_fields],
    }
    if parent is not None:
        view["private_metadata"] = str(parent.id)
    return view


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


def build_team_modal(db: Session, ticket: Ticket) -> dict:
    teams = db.execute(select(Team).order_by(Team.name)).scalars().all()
    return {
        "type": "modal",
        "callback_id": "team_modal",
        "private_metadata": str(ticket.id),
        "title": {"type": "plain_text", "text": f"Team #{ticket.ticket_number}"},
        "submit": {"type": "plain_text", "text": "Update"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "team",
                "label": {"type": "plain_text", "text": "Team"},
                "element": _team_select_element(teams, initial=ticket.team),
            }
        ],
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
