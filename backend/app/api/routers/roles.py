from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.permissions import ensure_can_grant, ensure_update, require
from app.models.user import User
from app.schemas.role import RoleCreateRequest, RoleOut, RoleUpdateRequest
from app.services import role_service

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleOut])
def list_roles(include_archived: bool = Query(default=False), db: Session = Depends(get_db)) -> list[RoleOut]:
    return role_service.list_roles(db, include_archived=include_archived)


@router.post("", response_model=RoleOut, status_code=201)
def create_role(
    payload: RoleCreateRequest, db: Session = Depends(get_db), user: User = Depends(require("create"))
) -> RoleOut:
    ensure_can_grant(
        db,
        user,
        create=payload.can_create_settings,
        edit=payload.can_edit_settings,
        delete=payload.can_delete_settings,
    )
    return role_service.create_role(
        db,
        name=payload.name,
        can_create_settings=payload.can_create_settings,
        can_edit_settings=payload.can_edit_settings,
        can_delete_settings=payload.can_delete_settings,
    )


@router.patch("/{role_id}", response_model=RoleOut)
def update_role(
    role_id: int, payload: RoleUpdateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> RoleOut:
    changes = payload.model_dump(exclude_unset=True)
    ensure_update(db, user, changes)
    role = role_service.get_role_or_404(db, role_id)
    ensure_can_grant(
        db,
        user,
        create=changes.get("can_create_settings", False),
        edit=changes.get("can_edit_settings", False),
        delete=changes.get("can_delete_settings", False),
    )
    return role_service.update_role(db, role, **changes)
