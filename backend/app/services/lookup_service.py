"""CRUD for the simple lookup tables that back ticket-creation dropdowns
(Category, SLA Policy) — the "Form Fields & Dropdowns" settings screen.

Not to be confused with `sla_service.py`, which computes SLA due dates and
breach status; this module only manages the SLAPolicy *rows themselves*.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.sla import SLAPolicy


def list_categories(db: Session, include_archived: bool = False) -> list[Category]:
    stmt = select(Category).order_by(Category.name)
    if not include_archived:
        stmt = stmt.where(Category.is_archived.is_(False))
    return list(db.execute(stmt).scalars().all())


def create_category(db: Session, name: str) -> Category:
    if db.execute(select(Category).where(Category.name == name)).scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="A category with this name already exists")
    category = Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, **updates: object) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in updates.items():
        if value is not None:
            setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def list_sla_policies(db: Session, include_archived: bool = False) -> list[SLAPolicy]:
    stmt = select(SLAPolicy).order_by(SLAPolicy.duration_hours)
    if not include_archived:
        stmt = stmt.where(SLAPolicy.is_archived.is_(False))
    return list(db.execute(stmt).scalars().all())


def create_sla_policy(db: Session, name: str, duration_hours: int, is_default: bool) -> SLAPolicy:
    policy = SLAPolicy(name=name, duration_hours=duration_hours, is_default=is_default)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def update_sla_policy(db: Session, policy_id: int, **updates: object) -> SLAPolicy:
    policy = db.get(SLAPolicy, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    for field, value in updates.items():
        if value is not None:
            setattr(policy, field, value)
    db.commit()
    db.refresh(policy)
    return policy
