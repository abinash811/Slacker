from datetime import datetime, timezone

from app.models.ticket import Ticket
from app.schemas.custom_field import CustomFieldValueOut
from app.schemas.lookup import CategoryOut, TeamOut
from app.schemas.tag import TagOut
from app.schemas.ticket import TicketListItem, TicketOut
from app.schemas.user import UserOut
from app.services import sla_service


def to_ticket_out(ticket: Ticket) -> TicketOut:
    now = datetime.now(timezone.utc)
    breached, remaining = sla_service.sla_status(ticket.sla_due_at, ticket.resolved_at, now)
    return TicketOut(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        description=ticket.description,
        customer=ticket.customer,
        business_id=ticket.business_id,
        mobile_number=ticket.mobile_number,
        doctor_name=ticket.doctor_name,
        category=CategoryOut.model_validate(ticket.category),
        team=TeamOut.model_validate(ticket.team),
        priority=ticket.priority,
        status=ticket.status,
        sla_hours=ticket.sla_hours,
        sla_due_at=ticket.sla_due_at,
        owner=UserOut.model_validate(ticket.owner) if ticket.owner else None,
        support_assignee=UserOut.model_validate(ticket.support_assignee) if ticket.support_assignee else None,
        created_by=UserOut.model_validate(ticket.created_by),
        slack_channel_id=ticket.slack_channel_id,
        slack_message_ts=ticket.slack_message_ts,
        created_at=ticket.created_at,
        first_response_at=ticket.first_response_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        updated_at=ticket.updated_at,
        sla_breached=breached,
        sla_remaining_seconds=remaining,
        age_seconds=int((now - ticket.created_at).total_seconds()),
        custom_field_values=[
            CustomFieldValueOut(field_definition_id=v.field_definition_id, label=v.field_definition.label, value=v.value)
            for v in ticket.custom_field_values
        ],
        tags=[TagOut.model_validate(t) for t in ticket.tags],
    )


def to_list_item(ticket: Ticket) -> TicketListItem:
    now = datetime.now(timezone.utc)
    breached, remaining = sla_service.sla_status(ticket.sla_due_at, ticket.resolved_at, now)
    return TicketListItem(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        customer=ticket.customer,
        business_id=ticket.business_id,
        mobile_number=ticket.mobile_number,
        doctor_name=ticket.doctor_name,
        category_name=ticket.category.name,
        team_name=ticket.team.name,
        owner_name=ticket.owner.name if ticket.owner else None,
        priority=ticket.priority,
        status=ticket.status,
        sla_breached=breached,
        sla_remaining_seconds=remaining,
        created_at=ticket.created_at,
        age_seconds=int((now - ticket.created_at).total_seconds()),
        updated_at=ticket.updated_at,
    )
