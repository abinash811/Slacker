"""CRUD for Tags (the "Form Fields & Dropdowns" settings screen) plus
attaching/detaching tags on a ticket. Tags are multi-select — unlike
Category, a ticket can carry several at once.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tag import Tag
from app.models.ticket import Ticket


def list_tags(db: Session, include_archived: bool = False) -> list[Tag]:
    stmt = select(Tag).order_by(Tag.name)
    if not include_archived:
        stmt = stmt.where(Tag.is_archived.is_(False))
    return list(db.execute(stmt).scalars().all())


def create_tag(db: Session, name: str) -> Tag:
    if db.execute(select(Tag).where(Tag.name == name)).scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="A tag with this name already exists")
    tag = Tag(name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag_id: int, **updates: object) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    for field, value in updates.items():
        if value is not None:
            setattr(tag, field, value)
    db.commit()
    db.refresh(tag)
    return tag


def set_tags(db: Session, ticket: Ticket, tag_ids: list[int]) -> None:
    """Replaces the ticket's full tag set with the given ids (empty list
    clears it). Does not commit — callers control the transaction so this
    composes with other changes made in the same request (see
    ticket_service.create_ticket / update_tags).
    """
    tags = list(db.execute(select(Tag).where(Tag.id.in_(tag_ids))).scalars().all()) if tag_ids else []
    ticket.tags = tags
