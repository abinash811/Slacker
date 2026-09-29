from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import TicketPriority, TicketStatus


class SavedViewFilters(BaseModel):
    """The ticket-list filters a view remembers — the same keys as the list
    endpoint's query parameters. Unknown keys are rejected."""

    model_config = ConfigDict(extra="forbid")

    team_id: int | None = None
    owner_id: int | None = None
    support_assignee_id: int | None = None
    category_id: int | None = None
    priority: TicketPriority | None = None
    status: TicketStatus | None = None
    state: Literal["active", "done"] | None = None
    sla_status: Literal["breached", "ok"] | None = None
    date_from: str | None = None
    date_to: str | None = None
    search: str | None = Field(default=None, max_length=200)


class SavedViewCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    filters: SavedViewFilters

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Enter a name.")
        return v


class SavedViewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    filters: SavedViewFilters
    created_at: datetime
