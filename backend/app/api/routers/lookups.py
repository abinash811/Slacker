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
    SLAPolicyCreateRequest,
    SLAPolicyOut,
    SLAPolicyUpdateRequest,
    TeamOut,
)
from app.schemas.user import UserOut
from app.services import lookup_service

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


@router.get("/sla-policies", response_model=list[SLAPolicyOut])
def list_sla_policies(include_archived: bool = Query(default=False), db: Session = Depends(get_db)) -> list[SLAPolicyOut]:
    return lookup_service.list_sla_policies(db, include_archived=include_archived)


@router.post("/sla-policies", response_model=SLAPolicyOut, status_code=201)
def create_sla_policy(payload: SLAPolicyCreateRequest, db: Session = Depends(get_db)) -> SLAPolicyOut:
    return lookup_service.create_sla_policy(db, payload.name, payload.duration_hours, payload.is_default)


@router.patch("/sla-policies/{policy_id}", response_model=SLAPolicyOut)
def update_sla_policy(policy_id: int, payload: SLAPolicyUpdateRequest, db: Session = Depends(get_db)) -> SLAPolicyOut:
    return lookup_service.update_sla_policy(db, policy_id, **payload.model_dump(exclude_unset=True))


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)) -> list[UserOut]:
    return db.execute(select(User).where(User.is_active.is_(True)).order_by(User.name)).scalars().all()
