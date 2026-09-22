"""Slack Bolt app: wires Slack interactions (shortcuts, slash commands,
buttons, modals, thread-reply events) to the ticket service layer.

Every listener here does the same three things: resolve the acting Slack
user to an internal `User`, call the one shared `ticket_service`/
`slack_service` function that also backs the REST API, and (for mutations)
refresh the Slack message. No ticket business logic is duplicated here.
"""

import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from slack_bolt import App
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.models.slack import SlackEventDedup
from app.models.team import Team
from app.services import slack_service, ticket_service
from app.slack import identity

logger = logging.getLogger(__name__)
settings = get_settings()

# `token_verification_enabled=False`: Bolt otherwise calls `auth.test` at
# startup and raises if the token is missing/invalid. We want the rest of
# the app (dashboard, API) to boot even before Slack credentials are
# configured — signature verification (the actual security control) still
# runs on every request regardless of this flag.
bolt_app = App(
    token=settings.slack_bot_token or "xoxb-not-configured",
    signing_secret=settings.slack_signing_secret or "not-configured",
    token_verification_enabled=False,
)


def _ignore_retries(request, next):
    """Slack retries a slow/failed ack up to 3 times (X-Slack-Retry-Num).
    Our handlers finish well within the 3s ack window in normal operation,
    so a retry means we already processed it — never re-run side effects.
    """
    if request.headers.get("x-slack-retry-num") is not None:
        logger.info("Ignoring Slack retry #%s", request.headers.get("x-slack-retry-num"))
        return
    next()


bolt_app.use(_ignore_retries)


def _already_processed(db, event_id: str | None) -> bool:
    if not event_id:
        return False
    return (
        db.execute(select(SlackEventDedup).where(SlackEventDedup.slack_event_id == event_id)).scalar_one_or_none()
        is not None
    )


def _mark_processed(db, event_id: str | None) -> None:
    if not event_id:
        return
    db.add(SlackEventDedup(slack_event_id=event_id, processed_at=datetime.now(timezone.utc)))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # another process already marked this event


# ---------------------------------------------------------------------------
# Workflow B: Slack -> dashboard ticket creation
# ---------------------------------------------------------------------------


@bolt_app.shortcut("create_ticket")
def handle_create_ticket_shortcut(ack, body, client):
    ack()
    with SessionLocal() as db:
        view = slack_service.build_create_ticket_modal(db)
    client.views_open(trigger_id=body["trigger_id"], view=view)


@bolt_app.command("/create-ticket")
def handle_create_ticket_command(ack, body, client):
    ack()
    with SessionLocal() as db:
        view = slack_service.build_create_ticket_modal(db)
    client.views_open(trigger_id=body["trigger_id"], view=view)


def _extract_custom_field_values(values: dict) -> list[tuple[int, str]]:
    """Reads every `custom_field_<id>` block (see
    `slack_service._build_custom_field_block`) out of a modal's submitted
    state, handling both the text-input and dropdown shapes. Blocks with
    no answer (they're optional) are skipped rather than saved as empty.
    """
    results = []
    for block_id, block_values in values.items():
        if not block_id.startswith("custom_field_"):
            continue
        field_id = int(block_id.removeprefix("custom_field_"))
        answer = block_values["value"]
        value = answer.get("value") or (answer.get("selected_option") or {}).get("value")
        if value:
            results.append((field_id, value))
    return results


@bolt_app.view("create_ticket_modal")
def handle_create_ticket_submission(ack, body, client, view):
    ack()
    values = view["state"]["values"]

    with SessionLocal() as db:
        creator = identity.resolve_or_create_user(db, client, body["user"]["id"])
        ticket = ticket_service.create_ticket(
            db,
            title=values["title"]["value"]["value"],
            description=values["description"]["value"]["value"],
            customer=values["customer"]["value"]["value"],
            business_id=values["business_id"]["value"]["value"],
            mobile_number=values["mobile_number"]["value"]["value"],
            doctor_name=values["doctor_name"]["value"]["value"],
            category_id=int(values["category"]["value"]["selected_option"]["value"]),
            team_id=int(values["team"]["value"]["selected_option"]["value"]),
            priority=TicketPriority(values["priority"]["value"]["selected_option"]["value"]),
            sla_policy_id=int(values["sla_policy"]["value"]["selected_option"]["value"]),
            owner_id=None,
            created_by=creator,
            source=EventSource.SLACK,
            custom_field_values=_extract_custom_field_values(values),
        )
        slack_service.post_ticket_message(db, ticket)


# ---------------------------------------------------------------------------
# Ticket message button clicks -> open the matching modal
# ---------------------------------------------------------------------------


@bolt_app.action("ticket_assign")
def handle_assign_click(ack, body, client):
    ack()
    ticket_id = int(body["actions"][0]["value"])
    with SessionLocal() as db:
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        view = slack_service.build_assign_modal(ticket)
    client.views_open(trigger_id=body["trigger_id"], view=view)


@bolt_app.action("ticket_team")
def handle_team_click(ack, body, client):
    ack()
    ticket_id = int(body["actions"][0]["value"])
    with SessionLocal() as db:
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        view = slack_service.build_team_modal(db, ticket)
    client.views_open(trigger_id=body["trigger_id"], view=view)


@bolt_app.action("ticket_status")
def handle_status_click(ack, body, client):
    ack()
    ticket_id = int(body["actions"][0]["value"])
    with SessionLocal() as db:
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        view = slack_service.build_status_modal(ticket)
    client.views_open(trigger_id=body["trigger_id"], view=view)


@bolt_app.action("ticket_priority")
def handle_priority_click(ack, body, client):
    ack()
    ticket_id = int(body["actions"][0]["value"])
    with SessionLocal() as db:
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        view = slack_service.build_priority_modal(ticket)
    client.views_open(trigger_id=body["trigger_id"], view=view)


@bolt_app.action("ticket_resolve")
def handle_resolve_click(ack, body, client):
    # The button already carries a Block Kit `confirm` dialog, so by the
    # time this fires the user has confirmed — resolve immediately.
    ack()
    ticket_id = int(body["actions"][0]["value"])
    with SessionLocal() as db:
        actor = identity.resolve_or_create_user(db, client, body["user"]["id"])
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        ticket = ticket_service.resolve_ticket(db, ticket, actor, EventSource.SLACK)
        slack_service.update_ticket_message(ticket)


# ---------------------------------------------------------------------------
# Modal submissions for assign / status / priority
# ---------------------------------------------------------------------------


@bolt_app.view("assign_ticket_modal")
def handle_assign_submission(ack, body, client, view):
    ack()
    ticket_id = int(view["private_metadata"])
    selected_slack_user_id = view["state"]["values"]["owner"]["value"]["selected_user"]
    with SessionLocal() as db:
        new_owner = identity.resolve_or_create_user(db, client, selected_slack_user_id)
        actor = identity.resolve_or_create_user(db, client, body["user"]["id"])
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        try:
            ticket = ticket_service.assign_ticket(db, ticket, new_owner, actor, EventSource.SLACK)
        except HTTPException as e:
            client.chat_postMessage(channel=body["user"]["id"], text=f"Couldn't assign ticket #{ticket.ticket_number}: {e.detail}")
            return
        slack_service.update_ticket_message(ticket)


@bolt_app.view("team_modal")
def handle_team_submission(ack, body, client, view):
    ack()
    ticket_id = int(view["private_metadata"])
    new_team_id = int(view["state"]["values"]["team"]["value"]["selected_option"]["value"])
    with SessionLocal() as db:
        actor = identity.resolve_or_create_user(db, client, body["user"]["id"])
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        new_team = db.get(Team, new_team_id)
        ticket = ticket_service.change_team(db, ticket, new_team, actor, EventSource.SLACK)
        slack_service.update_ticket_message(ticket)


@bolt_app.view("status_modal")
def handle_status_submission(ack, body, client, view):
    ack()
    ticket_id = int(view["private_metadata"])
    new_status = TicketStatus(view["state"]["values"]["status"]["value"]["selected_option"]["value"])
    with SessionLocal() as db:
        actor = identity.resolve_or_create_user(db, client, body["user"]["id"])
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        ticket = ticket_service.change_status(db, ticket, new_status, actor, EventSource.SLACK)
        slack_service.update_ticket_message(ticket)


@bolt_app.view("priority_modal")
def handle_priority_submission(ack, body, client, view):
    ack()
    ticket_id = int(view["private_metadata"])
    new_priority = TicketPriority(view["state"]["values"]["priority"]["value"]["selected_option"]["value"])
    with SessionLocal() as db:
        actor = identity.resolve_or_create_user(db, client, body["user"]["id"])
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        ticket = ticket_service.change_priority(db, ticket, new_priority, actor, EventSource.SLACK)
        slack_service.update_ticket_message(ticket)


# ---------------------------------------------------------------------------
# Thread replies -> first response / comment-reference tracking
# ---------------------------------------------------------------------------


@bolt_app.event("message")
def handle_message_event(body, event, client):
    if event.get("subtype") is not None or event.get("bot_id"):
        return  # ignore edits/deletes/joins and our own bot's messages

    thread_ts = event.get("thread_ts")
    if not thread_ts or thread_ts == event.get("ts"):
        return  # not a reply to an existing thread

    with SessionLocal() as db:
        event_id = body.get("event_id")
        if _already_processed(db, event_id):
            return

        ticket = ticket_service.find_ticket_by_slack_message(db, event["channel"], thread_ts)
        if ticket is None:
            _mark_processed(db, event_id)
            return

        author = identity.resolve_or_create_user(db, client, event["user"]) if event.get("user") else None
        ticket_service.record_comment_reference(db, ticket, author, event["ts"], EventSource.SLACK)
        _mark_processed(db, event_id)
