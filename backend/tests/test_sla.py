from datetime import datetime, timedelta, timezone

from app.services import sla_service


def test_compute_due_at_is_calendar_hours(seed):
    created_at = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)
    due_at = sla_service.compute_due_at(created_at, seed["sla_48h"])
    assert due_at == datetime(2026, 9, 12, 10, 0, tzinfo=timezone.utc)


def test_open_ticket_past_due_is_breached():
    now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    due_at = now - timedelta(hours=1)
    breached, remaining = sla_service.sla_status(due_at, resolved_at=None, now=now)
    assert breached is True
    assert remaining == -3600


def test_open_ticket_within_window_is_not_breached():
    now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    due_at = now + timedelta(hours=2)
    breached, remaining = sla_service.sla_status(due_at, resolved_at=None, now=now)
    assert breached is False
    assert remaining == 7200


def test_resolved_before_due_is_compliant():
    due_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    resolved_at = due_at - timedelta(minutes=30)
    breached, remaining = sla_service.sla_status(due_at, resolved_at=resolved_at)
    assert breached is False
    assert remaining is None


def test_resolved_after_due_is_breached():
    due_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    resolved_at = due_at + timedelta(minutes=30)
    breached, remaining = sla_service.sla_status(due_at, resolved_at=resolved_at)
    assert breached is True
    assert remaining is None
