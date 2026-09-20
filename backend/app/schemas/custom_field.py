from pydantic import BaseModel, ConfigDict, Field

from app.models.custom_field import CustomFieldType


class CustomFieldDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    field_type: CustomFieldType
    options: list[str] | None
    is_archived: bool


class CustomFieldDefinitionCreateRequest(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    field_type: CustomFieldType
    options: list[str] | None = None


class CustomFieldDefinitionUpdateRequest(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    options: list[str] | None = None
    is_archived: bool | None = None


class CustomFieldValueOut(BaseModel):
    field_definition_id: int
    label: str
    value: str


class CustomFieldValueInput(BaseModel):
    field_definition_id: int
    value: str
