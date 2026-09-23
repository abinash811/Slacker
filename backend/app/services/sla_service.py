"""SLA math lives in exactly one place so it is never hardcoded per-call-site
(spec section 7). Every consumer (API responses, analytics) calls into here.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import ColumnElement, and_, or_
from sqlalchemy.orm import Session

from app.models.sla import SLASettings

_SETTINGS_ID = 1  # single row — see SLASettings docstring


def get_settings(db: Session) -> SLASettings:
    settings = db.get(SLASettings, _SETTINGS_ID)
    if settings is None:
        settings = SLASettings(id=_SETTINGS_ID, default_hours=48)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_default_hours(db: Session) -> int:
    return get_settings(db).default_hours


def set_default_hours(db: Session, hours: int) -> SLASettings:
    settings = get_settings(db)
    settings.default_hours = hours
    db.commit()
    db.refresh(settings)
    return settings


def compute_due_at(created_at: datetime, hours: int) -> datetime:
    """Calendar-hour SLA (product decision for V1) — see docs/ARCHITECTURE.md
    for the business-hours alternative deferred to V2.
    """
    return created_at + timedelta(hours=hours)


def sla_status(
    sla_due_at: datetime, resolved_at: datetime | None, now: datetime | None = None
) -> tuple[bool, int | None]:
    """Returns (breached, remaining_seconds).

    `remaining_seconds` is negative once breached and still open, and None
    once resolved (the ticket has a fixed outcome, not a "remaining" clock).
    """
    now = now or datetime.now(timezone.utc)
    if resolved_at is not None:
        return resolved_at > sla_due_at, None
    return now > sla_due_at, int((sla_due_at - now).total_seconds())


def sla_breach_condition(resolved_at_col: ColumnElement, sla_due_at_col: ColumnElement, now: datetime) -> ColumnElement:
    """SQL expression mirroring `sla_status` above, for filtering/grouping
    in the database instead of in Python. Kept next to `sla_status` so the
    two definitions of "breached" can never drift apart.
    """
    return or_(
        and_(resolved_at_col.is_(None), sla_due_at_col < now),
        and_(resolved_at_col.isnot(None), resolved_at_col > sla_due_at_col),
    )
