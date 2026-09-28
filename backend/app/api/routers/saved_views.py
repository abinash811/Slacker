from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.saved_view import SavedViewCreateRequest, SavedViewOut
from app.services import saved_view_service

# Views are personal: every route acts on the current user's views only.
router = APIRouter(prefix="/me/views", tags=["saved views"])


@router.get("", response_model=list[SavedViewOut])
def list_views(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[SavedViewOut]:
    return saved_view_service.list_views(db, user)


@router.post("", response_model=SavedViewOut, status_code=201)
def create_view(
    payload: SavedViewCreateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> SavedViewOut:
    return saved_view_service.create_view(db, user, payload.name, payload.filters)


@router.delete("/{view_id}", status_code=204)
def delete_view(view_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    saved_view_service.delete_view(db, user, view_id)
