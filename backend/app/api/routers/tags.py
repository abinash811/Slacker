from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.tag import TagCreateRequest, TagOut, TagUpdateRequest
from app.services import tag_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagOut])
def list_tags(include_archived: bool = Query(default=False), db: Session = Depends(get_db)) -> list[TagOut]:
    return tag_service.list_tags(db, include_archived=include_archived)


@router.post("", response_model=TagOut, status_code=201)
def create_tag(payload: TagCreateRequest, db: Session = Depends(get_db)) -> TagOut:
    return tag_service.create_tag(db, payload.name)


@router.patch("/{tag_id}", response_model=TagOut)
def update_tag(tag_id: int, payload: TagUpdateRequest, db: Session = Depends(get_db)) -> TagOut:
    return tag_service.update_tag(db, tag_id, **payload.model_dump(exclude_unset=True))
