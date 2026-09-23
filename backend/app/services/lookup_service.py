"""CRUD for the simple lookup tables that back ticket-creation dropdowns
(currently just Category) — part of the Settings screens.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category


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
