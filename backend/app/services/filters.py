from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Select, or_

from app.models.enums import TicketPriority, TicketStatus
from app.models.ticket import Ticket
from app.services import sla_service


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
    sla_status: str | None = None  # "breached" | "ok"
    date_from: datetime | None = None
    date_to: datetime | None = None
    # Matches against the fixed identifying fields only (Business ID,
    # Mobile Number, Doctor Name) — not a general full-text search over
    # title/description.
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
    if filters.date_from is not None:
        stmt = stmt.where(Ticket.created_at >= filters.date_from)
    if filters.date_to is not None:
        stmt = stmt.where(Ticket.created_at <= filters.date_to)
    if filters.sla_status is not None:
        breached = sla_service.sla_breach_condition(Ticket.resolved_at, Ticket.sla_due_at, now)
        stmt = stmt.where(breached if filters.sla_status == "breached" else ~breached)
    if filters.search:
        pattern = f"%{filters.search}%"
        stmt = stmt.where(
            or_(
                Ticket.business_id.ilike(pattern),
                Ticket.mobile_number.ilike(pattern),
                Ticket.doctor_name.ilike(pattern),
            )
        )
    return stmt
