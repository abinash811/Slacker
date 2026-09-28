from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.saved_view import SavedView
from app.models.user import User
from app.schemas.saved_view import SavedViewFilters

MAX_VIEWS_PER_USER = 20


def list_views(db: Session, user: User) -> list[SavedView]:
    return list(db.execute(select(SavedView).where(SavedView.user_id == user.id).order_by(SavedView.name)).scalars())


def create_view(db: Session, user: User, name: str, filters: SavedViewFilters) -> SavedView:
    count = db.scalar(select(func.count()).where(SavedView.user_id == user.id)) or 0
    if count >= MAX_VIEWS_PER_USER:
        raise HTTPException(status_code=409, detail=f"You can save up to {MAX_VIEWS_PER_USER} views. Delete one first.")
    exists = db.scalar(select(SavedView.id).where(SavedView.user_id == user.id, func.lower(SavedView.name) == name.lower()))
    if exists:
        raise HTTPException(status_code=409, detail=f'You already have a view named "{name}". Pick another name.')
    view = SavedView(user_id=user.id, name=name, filters=filters.model_dump(exclude_none=True, mode="json"))
    db.add(view)
    db.commit()
    db.refresh(view)
    return view


def delete_view(db: Session, user: User, view_id: int) -> None:
    view = db.get(SavedView, view_id)
    # Someone else's view is reported as missing, not forbidden, so ids don't leak.
    if view is None or view.user_id != user.id:
        raise HTTPException(status_code=404, detail="View not found.")
    db.delete(view)
    db.commit()
