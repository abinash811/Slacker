from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.role import RoleCreateRequest, RoleOut, RoleUpdateRequest
from app.services import role_service

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleOut])
def list_roles(include_archived: bool = Query(default=False), db: Session = Depends(get_db)) -> list[RoleOut]:
    return role_service.list_roles(db, include_archived=include_archived)


@router.post("", response_model=RoleOut, status_code=201)
def create_role(payload: RoleCreateRequest, db: Session = Depends(get_db)) -> RoleOut:
    return role_service.create_role(
        db,
        name=payload.name,
        can_create_settings=payload.can_create_settings,
        can_edit_settings=payload.can_edit_settings,
        can_delete_settings=payload.can_delete_settings,
    )


@router.patch("/{role_id}", response_model=RoleOut)
def update_role(role_id: int, payload: RoleUpdateRequest, db: Session = Depends(get_db)) -> RoleOut:
    role = role_service.get_role_or_404(db, role_id)
    return role_service.update_role(db, role, **payload.model_dump(exclude_unset=True))
