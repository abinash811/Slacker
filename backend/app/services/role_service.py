from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.role import Role


def list_roles(db: Session, include_archived: bool = False) -> list[Role]:
    stmt = select(Role).order_by(Role.name)
    if not include_archived:
        stmt = stmt.where(Role.is_archived.is_(False))
    return list(db.execute(stmt).scalars().all())


def get_role_or_404(db: Session, role_id: int) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


def create_role(
    db: Session, *, name: str, can_create_settings: bool, can_edit_settings: bool, can_delete_settings: bool
) -> Role:
    existing = db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="A role with this name already exists")
    role = Role(
        name=name,
        can_create_settings=can_create_settings,
        can_edit_settings=can_edit_settings,
        can_delete_settings=can_delete_settings,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role: Role, **updates: object) -> Role:
    for field, value in updates.items():
        if value is not None:
            setattr(role, field, value)
    db.commit()
    db.refresh(role)
    return role
