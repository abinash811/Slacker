from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.category import Category
from app.models.sla import SLAPolicy
from app.models.team import Team
from app.models.user import User
from app.schemas.lookup import CategoryOut, SLAPolicyOut, TeamOut
from app.schemas.user import UserOut

router = APIRouter(tags=["lookups"])


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db)) -> list[TeamOut]:
    return db.execute(select(Team).order_by(Team.name)).scalars().all()


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryOut]:
    return db.execute(select(Category).order_by(Category.name)).scalars().all()


@router.get("/sla-policies", response_model=list[SLAPolicyOut])
def list_sla_policies(db: Session = Depends(get_db)) -> list[SLAPolicyOut]:
    return db.execute(select(SLAPolicy).order_by(SLAPolicy.duration_hours)).scalars().all()


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)) -> list[UserOut]:
    return db.execute(select(User).where(User.is_active.is_(True)).order_by(User.name)).scalars().all()
