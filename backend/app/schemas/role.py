from pydantic import BaseModel, ConfigDict, Field


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    can_create_settings: bool
    can_edit_settings: bool
    can_delete_settings: bool
    is_archived: bool


class RoleCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    can_create_settings: bool = False
    can_edit_settings: bool = False
    can_delete_settings: bool = False


class RoleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    can_create_settings: bool | None = None
    can_edit_settings: bool | None = None
    can_delete_settings: bool | None = None
    is_archived: bool | None = None
