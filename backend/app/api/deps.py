from datetime import datetime

from fastapi import Query

from app.models.enums import TicketPriority, TicketStatus
from app.services.filters import TicketFilters


def get_ticket_filters(
    team_id: int | None = Query(default=None),
    owner_id: int | None = Query(default=None),
    support_assignee_id: int | None = Query(default=None),
    category_id: int | None = Query(default=None),
    priority: TicketPriority | None = Query(default=None),
    status: TicketStatus | None = Query(default=None),
    sla_status: str | None = Query(default=None, pattern="^(breached|ok)$"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    search: str | None = Query(default=None),
) -> TicketFilters:
    return TicketFilters(
        team_id=team_id,
        owner_id=owner_id,
        support_assignee_id=support_assignee_id,
        category_id=category_id,
        priority=priority,
        status=status,
        sla_status=sla_status,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
