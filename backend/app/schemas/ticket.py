from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TicketPriority, TicketStatus
from app.schemas.custom_field import CustomFieldValueInput, CustomFieldValueOut
from app.schemas.lookup import CategoryOut, SLAPolicyOut, TeamOut
from app.schemas.tag import TagOut
from app.schemas.user import UserOut


class TicketCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1)
    customer: str = Field(min_length=1, max_length=255)
    business_id: str | None = Field(default=None, max_length=100)
    mobile_number: str | None = Field(default=None, max_length=32)
    doctor_name: str | None = Field(default=None, max_length=255)
    category_id: int
    team_id: int
    priority: TicketPriority = TicketPriority.MEDIUM
    sla_policy_id: int
    owner_id: int | None = None
    # Only meaningful for Workflow A (dashboard -> Slack). Workflow B
    # (Slack -> dashboard) always posts, since the ticket originates there.
    push_to_slack: bool = True
    slack_channel_id: str | None = None  # explicit override; else team routing applies
    custom_field_values: list[CustomFieldValueInput] = []
    tag_ids: list[int] = []


class AssignRequest(BaseModel):
    owner_id: int


class StatusChangeRequest(BaseModel):
    status: TicketStatus


class PriorityChangeRequest(BaseModel):
    priority: TicketPriority


class TagsUpdateRequest(BaseModel):
    tag_ids: list[int]


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_number: int
    title: str
    description: str
    customer: str
    business_id: str | None
    mobile_number: str | None
    doctor_name: str | None
    category: CategoryOut
    team: TeamOut
    priority: TicketPriority
    status: TicketStatus
    sla_policy: SLAPolicyOut
    sla_due_at: datetime
    owner: UserOut | None
    created_by: UserOut
    slack_channel_id: str | None
    slack_message_ts: str | None
    created_at: datetime
    first_response_at: datetime | None
    resolved_at: datetime | None
    closed_at: datetime | None
    updated_at: datetime

    # Computed SLA fields, always derived — never stored/hardcoded.
    sla_breached: bool
    sla_remaining_seconds: int | None
    age_seconds: int

    custom_field_values: list[CustomFieldValueOut] = []
    tags: list[TagOut] = []


class TicketListItem(BaseModel):
    id: int
    ticket_number: int
    title: str
    customer: str
    business_id: str | None
    mobile_number: str | None
    doctor_name: str | None
    category_name: str
    team_name: str
    owner_name: str | None
    priority: TicketPriority
    status: TicketStatus
    sla_breached: bool
    created_at: datetime
    age_seconds: int
    updated_at: datetime


class TicketListResponse(BaseModel):
    items: list[TicketListItem]
    total: int


class TimelineEvent(BaseModel):
    timestamp: datetime
    event_type: str
    description: str
    actor_name: str | None
