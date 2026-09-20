from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.custom_field import (
    CustomFieldDefinitionCreateRequest,
    CustomFieldDefinitionOut,
    CustomFieldDefinitionUpdateRequest,
)
from app.services import custom_field_service

router = APIRouter(prefix="/custom-fields", tags=["custom-fields"])


@router.get("", response_model=list[CustomFieldDefinitionOut])
def list_custom_fields(
    include_archived: bool = Query(default=False), db: Session = Depends(get_db)
) -> list[CustomFieldDefinitionOut]:
    return custom_field_service.list_definitions(db, include_archived=include_archived)


@router.post("", response_model=CustomFieldDefinitionOut, status_code=201)
def create_custom_field(payload: CustomFieldDefinitionCreateRequest, db: Session = Depends(get_db)) -> CustomFieldDefinitionOut:
    return custom_field_service.create_definition(
        db, label=payload.label, field_type=payload.field_type, options=payload.options
    )


@router.patch("/{field_id}", response_model=CustomFieldDefinitionOut)
def update_custom_field(
    field_id: int, payload: CustomFieldDefinitionUpdateRequest, db: Session = Depends(get_db)
) -> CustomFieldDefinitionOut:
    return custom_field_service.update_definition(db, field_id, **payload.model_dump(exclude_unset=True))
