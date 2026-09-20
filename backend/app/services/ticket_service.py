"""Ticket business logic. This is the ONLY place ticket state changes.

Both the dashboard REST router and the Slack action handlers call into
these functions, so a state transition made from a Slack button and one
made from the dashboard are guaranteed to be recorded identically (same
history rows, same audit trail) — see docs/ARCHITECTURE.md section 2.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.models.sla import SLAPolicy
from app.models.ticket import (
    Ticket,
    TicketAssignment,
    TicketComment,
    TicketPriorityHistory,
    TicketStatusHistory,
)
from app.models.user import User
from app.schemas.ticket import TimelineEvent
from app.services import audit_service, sla_service
from app.services.filters import TicketFilters, apply as apply_filters

RESOLVED_STATUSES = {TicketStatus.RESOLVED, TicketStatus.CLOSED}

TICKET_LOAD_OPTIONS = (
    joinedload(Ticket.category),
    joinedload(Ticket.team),
    joinedload(Ticket.sla_policy),
    joinedload(Ticket.owner),
    joinedload(Ticket.created_by),
)


def get_ticket_or_404(db: Session, ticket_id: int) -> Ticket:
    ticket = db.execute(
        select(Ticket).options(*TICKET_LOAD_OPTIONS).where(Ticket.id == ticket_id)
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def create_ticket(
    db: Session,
    *,
    title: str,
    description: str,
    customer: str,
    category_id: int,
    team_id: int,
    priority: TicketPriority,
    sla_policy_id: int,
    owner_id: int | None,
    created_by: User,
    source: EventSource,
) -> Ticket:
    policy = db.get(SLAPolicy, sla_policy_id)
    if policy is None:
        raise HTTPException(status_code=400, detail="Unknown SLA policy")

    now = datetime.now(timezone.utc)
    ticket = Ticket(
        title=title,
        description=description,
        customer=customer,
        category_id=category_id,
        team_id=team_id,
        priority=priority,
        status=TicketStatus.OPEN,
        sla_policy_id=sla_policy_id,
        # `created_at` is set explicitly (rather than left to its column
        # default) so it is guaranteed to be the exact same instant
        # `sla_due_at` was computed from — the SLA clock must start at
        # ticket creation, not a few microseconds later at flush time.
        created_at=now,
        sla_due_at=sla_service.compute_due_at(now, policy),
        owner_id=owner_id,
        created_by_id=created_by.id,
    )
    db.add(ticket)
    db.flush()  # assign ticket.id (and ticket_number via server default)

    db.add(TicketStatusHistory(ticket_id=ticket.id, previous_status=None, new_status=TicketStatus.OPEN, changed_by_id=created_by.id))
    db.add(TicketPriorityHistory(ticket_id=ticket.id, previous_priority=None, new_priority=priority, changed_by_id=created_by.id))
    if owner_id is not None:
        db.add(TicketAssignment(ticket_id=ticket.id, previous_owner_id=None, new_owner_id=owner_id, changed_by_id=created_by.id))

    audit_service.record_event(
        db,
        ticket_id=ticket.id,
        actor_id=created_by.id,
        source=source,
        event_type="ticket_created",
        payload={"title": title},
    )

    db.commit()
    db.refresh(ticket)
    return get_ticket_or_404(db, ticket.id)


def assign_ticket(db: Session, ticket: Ticket, new_owner: User, changed_by: User, source: EventSource) -> Ticket:
    if ticket.owner_id == new_owner.id:
        return ticket  # no-op: already the owner, don't pollute history

    previous_owner_id = ticket.owner_id
    ticket.owner_id = new_owner.id
    db.add(
        TicketAssignment(
            ticket_id=ticket.id,
            previous_owner_id=previous_owner_id,
            new_owner_id=new_owner.id,
            changed_by_id=changed_by.id,
        )
    )
    audit_service.record_event(
        db,
        ticket_id=ticket.id,
        actor_id=changed_by.id,
        source=source,
        event_type="reassigned" if previous_owner_id else "assigned",
        payload={"previous_owner_id": previous_owner_id, "new_owner_id": new_owner.id},
    )
    db.commit()
    db.refresh(ticket)
    return ticket


def change_status(db: Session, ticket: Ticket, new_status: TicketStatus, changed_by: User, source: EventSource) -> Ticket:
    if ticket.status == new_status:
        return ticket

    previous_status = ticket.status
    ticket.status = new_status
    now = datetime.now(timezone.utc)

    if new_status == TicketStatus.RESOLVED and ticket.resolved_at is None:
        ticket.resolved_at = now
    if new_status == TicketStatus.CLOSED and ticket.closed_at is None:
        ticket.closed_at = now
    # Moving back out of a resolved/closed state (reopened) clears the
    # terminal timestamps so resolution-time metrics reflect the new outcome.
    if new_status not in RESOLVED_STATUSES:
        ticket.resolved_at = None
        ticket.closed_at = None

    db.add(
        TicketStatusHistory(
            ticket_id=ticket.id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by_id=changed_by.id,
        )
    )
    audit_service.record_event(
        db,
        ticket_id=ticket.id,
        actor_id=changed_by.id,
        source=source,
        event_type="status_changed",
        payload={"previous": previous_status.value, "new": new_status.value},
    )
    db.commit()
    db.refresh(ticket)
    return ticket


def change_priority(db: Session, ticket: Ticket, new_priority: TicketPriority, changed_by: User, source: EventSource) -> Ticket:
    if ticket.priority == new_priority:
        return ticket

    previous_priority = ticket.priority
    ticket.priority = new_priority
    db.add(
        TicketPriorityHistory(
            ticket_id=ticket.id,
            previous_priority=previous_priority,
            new_priority=new_priority,
            changed_by_id=changed_by.id,
        )
    )
    audit_service.record_event(
        db,
        ticket_id=ticket.id,
        actor_id=changed_by.id,
        source=source,
        event_type="priority_changed",
        payload={"previous": previous_priority.value, "new": new_priority.value},
    )
    db.commit()
    db.refresh(ticket)
    return ticket


def resolve_ticket(db: Session, ticket: Ticket, resolved_by: User, source: EventSource) -> Ticket:
    return change_status(db, ticket, TicketStatus.RESOLVED, resolved_by, source)


def record_comment_reference(
    db: Session, ticket: Ticket, author: User | None, slack_ts: str, source: EventSource
) -> Ticket:
    """Called when a reply lands in the ticket's Slack thread. Stores only
    the reference (who/when/ts) — the message body stays in Slack.
    """
    db.add(TicketComment(ticket_id=ticket.id, author_id=author.id if author else None, slack_ts=slack_ts))
    if ticket.first_response_at is None:
        ticket.first_response_at = datetime.now(timezone.utc)
    audit_service.record_event(
        db,
        ticket_id=ticket.id,
        actor_id=author.id if author else None,
        source=source,
        event_type="comment_added",
        payload={"slack_ts": slack_ts},
    )
    db.commit()
    db.refresh(ticket)
    return ticket


_SORTABLE_COLUMNS = {
    "created_at": Ticket.created_at,
    "updated_at": Ticket.updated_at,
    "priority": Ticket.priority,
    "status": Ticket.status,
    "sla_due_at": Ticket.sla_due_at,
    "ticket_number": Ticket.ticket_number,
}


def list_tickets(
    db: Session,
    filters: TicketFilters,
    *,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Ticket], int]:
    now = datetime.now(timezone.utc)
    stmt = select(Ticket).options(*TICKET_LOAD_OPTIONS)
    stmt = apply_filters(stmt, filters, now)

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0

    sort_col = _SORTABLE_COLUMNS.get(sort_by, Ticket.created_at)
    stmt = stmt.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    items = list(db.execute(stmt).unique().scalars().all())
    return items, total


def find_ticket_by_slack_message(db: Session, channel_id: str, message_ts: str) -> Ticket | None:
    return db.execute(
        select(Ticket)
        .options(*TICKET_LOAD_OPTIONS)
        .where(Ticket.slack_channel_id == channel_id, Ticket.slack_message_ts == message_ts)
    ).scalar_one_or_none()


def get_timeline(db: Session, ticket: Ticket) -> list[TimelineEvent]:
    """Merges every history table into one chronological feed (spec section
    11) — the single view that answers "who owned this and when".
    """
    actor_ids: set[int] = set()
    raw_events: list[tuple] = []  # (timestamp, event_type, description_fn, actor_id)

    raw_events.append((ticket.created_at, "created", lambda _: "Ticket created", ticket.created_by_id))
    actor_ids.add(ticket.created_by_id)

    status_rows = db.execute(
        select(TicketStatusHistory).where(TicketStatusHistory.ticket_id == ticket.id)
    ).scalars().all()
    for row in status_rows:
        actor_ids.add(row.changed_by_id)
        if row.previous_status is None:
            continue  # already represented by the "created" event
        raw_events.append(
            (row.created_at, "status_changed", lambda names, r=row: f"Status changed to {r.new_status.value.replace('_', ' ').title()}", row.changed_by_id)
        )

    priority_rows = db.execute(
        select(TicketPriorityHistory).where(TicketPriorityHistory.ticket_id == ticket.id)
    ).scalars().all()
    for row in priority_rows:
        actor_ids.add(row.changed_by_id)
        if row.previous_priority is None:
            continue
        raw_events.append(
            (row.created_at, "priority_changed", lambda names, r=row: f"Priority changed to {r.new_priority.value.title()}", row.changed_by_id)
        )

    assignment_rows = db.execute(
        select(TicketAssignment).where(TicketAssignment.ticket_id == ticket.id)
    ).scalars().all()
    for row in assignment_rows:
        actor_ids.add(row.new_owner_id)
        actor_ids.add(row.changed_by_id)
        if row.previous_owner_id:
            actor_ids.add(row.previous_owner_id)
            desc = lambda names, r=row: f"Reassigned to {names.get(r.new_owner_id, '—')} (from {names.get(r.previous_owner_id, '—')})"
        else:
            desc = lambda names, r=row: f"Assigned to {names.get(r.new_owner_id, '—')}"
        raw_events.append((row.created_at, "assigned", desc, row.changed_by_id))

    comment_rows = db.execute(
        select(TicketComment).where(TicketComment.ticket_id == ticket.id)
    ).scalars().all()
    for row in comment_rows:
        if row.author_id:
            actor_ids.add(row.author_id)
        raw_events.append((row.created_at, "comment", lambda names: "Replied in Slack thread", row.author_id))

    names: dict[int, str] = {}
    if actor_ids:
        for user in db.execute(select(User).where(User.id.in_(actor_ids))).scalars().all():
            names[user.id] = user.name

    events = [
        TimelineEvent(
            timestamp=ts,
            event_type=event_type,
            description=desc_fn(names),
            actor_name=names.get(actor_id) if actor_id else None,
        )
        for ts, event_type, desc_fn, actor_id in raw_events
    ]
    return sorted(events, key=lambda e: e.timestamp)
