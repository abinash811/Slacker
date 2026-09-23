from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.team import Team
from app.models.user import User
from app.schemas.lookup import (
    CategoryCreateRequest,
    CategoryOut,
    CategoryUpdateRequest,
    SLASettingsOut,
    SLASettingsUpdateRequest,
    TeamOut,
)
from app.schemas.user import UserOut
from app.services import lookup_service, sla_service

router = APIRouter(tags=["lookups"])


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db)) -> list[TeamOut]:
    return db.execute(select(Team).order_by(Team.name)).scalars().all()


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(include_archived: bool = Query(default=False), db: Session = Depends(get_db)) -> list[CategoryOut]:
    return lookup_service.list_categories(db, include_archived=include_archived)


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreateRequest, db: Session = Depends(get_db)) -> CategoryOut:
    return lookup_service.create_category(db, payload.name)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdateRequest, db: Session = Depends(get_db)) -> CategoryOut:
    return lookup_service.update_category(db, category_id, **payload.model_dump(exclude_unset=True))


@router.get("/sla-settings", response_model=SLASettingsOut)
def get_sla_settings(db: Session = Depends(get_db)) -> SLASettingsOut:
    return sla_service.get_settings(db)


@router.patch("/sla-settings", response_model=SLASettingsOut)
def update_sla_settings(payload: SLASettingsUpdateRequest, db: Session = Depends(get_db)) -> SLASettingsOut:
    return sla_service.set_default_hours(db, payload.default_hours)


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)) -> list[UserOut]:
    return db.execute(select(User).where(User.is_active.is_(True)).order_by(User.name)).scalars().all()
