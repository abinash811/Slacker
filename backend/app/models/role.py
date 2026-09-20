from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Role(Base, TimestampMixin):
    """An admin-defined, workspace-wide role (e.g. "Sales Lead", "Support
    Manager") — a shared pool reused across every team, not scoped to one
    specific team.

    The three flags below gate access to the Settings panel only (Teams &
    Permissions, Form Fields & Dropdowns) — not tickets or anything else in
    the dashboard, which stay open to everyone per the V1 "everyone sees
    everything" model. Enforcement of these flags is deliberately not wired
    up yet (see docs/ROADMAP.md) — this table exists so it can be, later,
    without another schema change.
    """

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    can_create_settings: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_edit_settings: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_delete_settings: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
