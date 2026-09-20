import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_ticket_filters
from app.api.serializers import to_list_item, to_ticket_out
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.enums import EventSource
from app.models.user import User
from app.schemas.ticket import (
    AssignRequest,
    PriorityChangeRequest,
    StatusChangeRequest,
    TicketCreateRequest,
    TicketListResponse,
    TicketOut,
    TimelineEvent,
)
from app.services import ticket_service
from app.services.filters import TicketFilters
from app.services.slack_service import post_ticket_message, update_ticket_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketListResponse)
def list_tickets(
    filters: TicketFilters = Depends(get_ticket_filters),
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
) -> TicketListResponse:
    items, total = ticket_service.list_tickets(
        db, filters, sort_by=sort_by, sort_dir=sort_dir, page=page, page_size=page_size
    )
    return TicketListResponse(items=[to_list_item(t) for t in items], total=total)


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    payload: TicketCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketOut:
    """Workflow A (spec section 5): dashboard creates the ticket, then
    pushes it to Slack unless the caller explicitly opts out.
    """
    ticket = ticket_service.create_ticket(
        db,
        title=payload.title,
        description=payload.description,
        customer=payload.customer,
        category_id=payload.category_id,
        team_id=payload.team_id,
        priority=payload.priority,
        sla_policy_id=payload.sla_policy_id,
        owner_id=payload.owner_id,
        created_by=current_user,
        source=EventSource.DASHBOARD,
    )

    if payload.push_to_slack:
        if payload.slack_channel_id:
            ticket.slack_channel_id = payload.slack_channel_id
        try:
            ticket = post_ticket_message(db, ticket)
        except Exception:
            logger.exception("Failed to push ticket %s to Slack", ticket.id)
            # Ticket already exists in the DB (source of truth) even if the
            # Slack push failed — surface the failure but don't roll back.

    return to_ticket_out(ticket_service.get_ticket_or_404(db, ticket.id))


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)) -> TicketOut:
    return to_ticket_out(ticket_service.get_ticket_or_404(db, ticket_id))


@router.get("/{ticket_id}/timeline", response_model=list[TimelineEvent])
def get_ticket_timeline(ticket_id: int, db: Session = Depends(get_db)) -> list[TimelineEvent]:
    ticket = ticket_service.get_ticket_or_404(db, ticket_id)
    return ticket_service.get_timeline(db, ticket)


@router.post("/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: int,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketOut:
    new_owner = db.get(User, payload.owner_id)
    if new_owner is None:
        raise HTTPException(status_code=404, detail="User not found")
    ticket = ticket_service.get_ticket_or_404(db, ticket_id)
    ticket = ticket_service.assign_ticket(db, ticket, new_owner, current_user, EventSource.DASHBOARD)
    update_ticket_message(ticket)
    return to_ticket_out(ticket_service.get_ticket_or_404(db, ticket.id))


@router.post("/{ticket_id}/status", response_model=TicketOut)
def change_ticket_status(
    ticket_id: int,
    payload: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketOut:
    ticket = ticket_service.get_ticket_or_404(db, ticket_id)
    ticket = ticket_service.change_status(db, ticket, payload.status, current_user, EventSource.DASHBOARD)
    update_ticket_message(ticket)
    return to_ticket_out(ticket_service.get_ticket_or_404(db, ticket.id))


@router.post("/{ticket_id}/priority", response_model=TicketOut)
def change_ticket_priority(
    ticket_id: int,
    payload: PriorityChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketOut:
    ticket = ticket_service.get_ticket_or_404(db, ticket_id)
    ticket = ticket_service.change_priority(db, ticket, payload.priority, current_user, EventSource.DASHBOARD)
    update_ticket_message(ticket)
    return to_ticket_out(ticket_service.get_ticket_or_404(db, ticket.id))


@router.post("/{ticket_id}/resolve", response_model=TicketOut)
def resolve_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketOut:
    ticket = ticket_service.get_ticket_or_404(db, ticket_id)
    ticket = ticket_service.resolve_ticket(db, ticket, current_user, EventSource.DASHBOARD)
    update_ticket_message(ticket)
    return to_ticket_out(ticket_service.get_ticket_or_404(db, ticket.id))
