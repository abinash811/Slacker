from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiTokenCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class ApiTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used_at: datetime | None


class ApiTokenCreated(ApiTokenOut):
    # The full key. Returned only in the create response.
    key: str


class McpInfo(BaseModel):
    """Where AI assistants connect, for the Connect page."""

    url: str
