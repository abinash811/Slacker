from pydantic import BaseModel, ConfigDict, Field


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_archived: bool = False


class TagCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TagUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    is_archived: bool | None = None
