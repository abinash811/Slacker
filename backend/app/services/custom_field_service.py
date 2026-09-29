from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.custom_field import CustomFieldDefinition, CustomFieldType, TicketCustomFieldValue


def list_definitions(db: Session, include_archived: bool = False) -> list[CustomFieldDefinition]:
    stmt = select(CustomFieldDefinition).order_by(CustomFieldDefinition.label)
    if not include_archived:
        stmt = stmt.where(CustomFieldDefinition.is_archived.is_(False))
    return list(db.execute(stmt).scalars().all())


def create_definition(
    db: Session, *, label: str, field_type: CustomFieldType, options: list[str] | None
) -> CustomFieldDefinition:
    if field_type == CustomFieldType.DROPDOWN and not options:
        raise HTTPException(status_code=400, detail="Dropdown fields need at least one option")
    definition = CustomFieldDefinition(
        label=label, field_type=field_type, options=options if field_type == CustomFieldType.DROPDOWN else None
    )
    db.add(definition)
    db.commit()
    db.refresh(definition)
    return definition


def update_definition(db: Session, definition_id: int, **updates: object) -> CustomFieldDefinition:
    definition = db.get(CustomFieldDefinition, definition_id)
    if definition is None:
        raise HTTPException(status_code=404, detail="Custom field not found")
    for field, value in updates.items():
        if value is not None:
            setattr(definition, field, value)
    db.commit()
    db.refresh(definition)
    return definition


def save_values(db: Session, ticket_id: int, values: list[tuple[int, str]]) -> None:
    """Persists a ticket's custom field values at creation. Later edits
    go through `replace_values`.
    """
    for field_definition_id, value in values:
        if db.get(CustomFieldDefinition, field_definition_id) is None:
            raise HTTPException(status_code=400, detail=f"Unknown custom field {field_definition_id}")
        db.add(TicketCustomFieldValue(ticket_id=ticket_id, field_definition_id=field_definition_id, value=value))


def replace_values(db: Session, ticket_id: int, values: list[tuple[int, str]]) -> list[str]:
    """Sets, changes or (with an empty value) clears each listed field on a
    ticket. Fields not listed are left alone. Returns the labels of the
    fields that actually changed.
    """
    existing = {
        v.field_definition_id: v
        for v in db.execute(select(TicketCustomFieldValue).where(TicketCustomFieldValue.ticket_id == ticket_id)).scalars()
    }
    changed: list[str] = []
    for field_definition_id, raw in values:
        definition = db.get(CustomFieldDefinition, field_definition_id)
        if definition is None:
            raise HTTPException(status_code=400, detail=f"Unknown custom field {field_definition_id}")
        value = raw.strip()
        current = existing.get(field_definition_id)
        if not value:
            if current is not None:
                db.delete(current)
                changed.append(definition.label)
        elif current is None:
            db.add(TicketCustomFieldValue(ticket_id=ticket_id, field_definition_id=field_definition_id, value=value))
            changed.append(definition.label)
        elif current.value != value:
            current.value = value
            changed.append(definition.label)
    return changed
