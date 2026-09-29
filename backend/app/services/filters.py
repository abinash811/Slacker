from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import Select, String, cast, or_

from app.models.enums import TicketPriority, TicketStatus
from app.models.ticket import Ticket
from app.services import sla_service

# Ongoing tickets due within this window count as "at risk" of breaching.
AT_RISK_WINDOW = timedelta(hours=24)


@dataclass
class TicketFilters:
    """The global filter set from spec section 9 — shared by the ticket
    list endpoint and every analytics endpoint, so "Team = Product" narrows
    both screens identically.
    """

    team_id: int | None = None
    owner_id: int | None = None
    support_assignee_id: int | None = None
    category_id: int | None = None
    priority: TicketPriority | None = None
    status: TicketStatus | None = None
    # "active": not yet resolved or closed; "done": resolved or closed.
    state: str | None = None
    # "breached" | "ok" | "at_risk" (ongoing, due within AT_RISK_WINDOW)
    sla_status: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    # Matches ticket number, title, business name, Business ID, mobile
    # number, or doctor name (case-insensitive, partial). Not the description.
    search: str | None = None


def apply(stmt: Select, filters: TicketFilters, now: datetime) -> Select:
    if filters.team_id is not None:
        stmt = stmt.where(Ticket.team_id == filters.team_id)
    if filters.owner_id is not None:
        stmt = stmt.where(Ticket.owner_id == filters.owner_id)
    if filters.support_assignee_id is not None:
        stmt = stmt.where(Ticket.support_assignee_id == filters.support_assignee_id)
    if filters.category_id is not None:
        stmt = stmt.where(Ticket.category_id == filters.category_id)
    if filters.priority is not None:
        stmt = stmt.where(Ticket.priority == filters.priority)
    if filters.status is not None:
        stmt = stmt.where(Ticket.status == filters.status)
    if filters.state is not None:
        done = Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        stmt = stmt.where(done if filters.state == "done" else ~done)
    if filters.date_from is not None:
        stmt = stmt.where(Ticket.created_at >= filters.date_from)
    if filters.date_to is not None:
        stmt = stmt.where(Ticket.created_at <= filters.date_to)
    if filters.sla_status == "at_risk":
        stmt = stmt.where(
            Ticket.resolved_at.is_(None),
            Ticket.sla_due_at >= now,
            Ticket.sla_due_at < now + AT_RISK_WINDOW,
        )
    elif filters.sla_status is not None:
        breached = sla_service.sla_breach_condition(Ticket.resolved_at, Ticket.sla_due_at, now)
        stmt = stmt.where(breached if filters.sla_status == "breached" else ~breached)
    if filters.search:
        term = filters.search.strip().lstrip("#")
        pattern = f"%{term}%"
        stmt = stmt.where(
            or_(
                cast(Ticket.ticket_number, String).ilike(pattern),
                Ticket.title.ilike(pattern),
                Ticket.customer.ilike(pattern),
                Ticket.business_id.ilike(pattern),
                Ticket.mobile_number.ilike(pattern),
                Ticket.doctor_name.ilike(pattern),
            )
        )
    return stmt
