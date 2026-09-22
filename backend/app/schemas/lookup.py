from pydantic import BaseModel, ConfigDict, Field


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_default: bool = False


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_archived: bool = False


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    is_archived: bool | None = None


class SLAPolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    duration_hours: int
    is_default: bool
    is_archived: bool = False


class SLAPolicyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    duration_hours: int = Field(gt=0)
    is_default: bool = False


class SLAPolicyUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    duration_hours: int | None = Field(default=None, gt=0)
    is_default: bool | None = None
    is_archived: bool | None = None
