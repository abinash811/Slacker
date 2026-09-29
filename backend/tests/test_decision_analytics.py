"""Aging, due-soon (at risk) and the per-person scorecard."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.services import analytics_service, ticket_service
from app.services.filters import TicketFilters

HEADERS = {"X-Dev-User-Email": "creator@example.com"}


def _ticket(db, seed, title, *, age_hours=0, due_in_hours=48, owner=None, **overrides):
    ticket = ticket_service.create_ticket(
        db, title=title, description="d", customer="c", category_id=seed["category"].id, team_id=seed["team"].id,
        priority=TicketPriority.MEDIUM, owner_id=owner.id if owner else None, created_by=seed["creator"],
        source=EventSource.DASHBOARD, **overrides,
    )
    now = datetime.now(timezone.utc)
    ticket.created_at = now - timedelta(hours=age_hours)
    ticket.sla_due_at = now + timedelta(hours=due_in_hours)
    db.commit()
    return ticket


def _resolve(db, seed, ticket, *, after_hours, first_response_after_hours=None):
    ticket_service.resolve_ticket(db, ticket, seed["creator"], EventSource.DASHBOARD)
    ticket.resolved_at = ticket.created_at + timedelta(hours=after_hours)
    if first_response_after_hours is not None:
        ticket.first_response_at = ticket.created_at + timedelta(hours=first_response_after_hours)
    db.commit()


def test_aging_buckets_ongoing_tickets_by_age(db_session, seed):
    _ticket(db_session, seed, "fresh", age_hours=2)
    _ticket(db_session, seed, "two days", age_hours=48)
    _ticket(db_session, seed, "stuck", age_hours=24 * 10, due_in_hours=-24)
    done = _ticket(db_session, seed, "old but resolved", age_hours=24 * 20)
    _resolve(db_session, seed, done, after_hours=1)

    # A status filter doesn't hide ongoing tickets from aging.
    buckets = analytics_service.aging(db_session, TicketFilters(status=TicketStatus.RESOLVED))
    assert [(b.key, b.count, b.sla_breached) for b in buckets] == [
        ("under_1d", 1, 0),
        ("1_3d", 1, 0),
        ("3_7d", 0, 0),
        ("over_7d", 1, 1),
    ]


def test_at_risk_filter_finds_tickets_due_in_the_next_24_hours(db_session, seed):
    _ticket(db_session, seed, "due in 3h", due_in_hours=3)
    _ticket(db_session, seed, "due in 30h", due_in_hours=30)
    _ticket(db_session, seed, "already breached", due_in_hours=-1)
    resolved = _ticket(db_session, seed, "resolved, due soon", due_in_hours=2)
    _resolve(db_session, seed, resolved, after_hours=0.5)

    response = TestClient(app).get("/api/tickets?sla_status=at_risk&sort_by=sla_due_at&sort_dir=asc", headers=HEADERS)
    assert response.status_code == 200
    assert [t["title"] for t in response.json()["items"]] == ["due in 3h"]


def test_scorecard_per_owner(db_session, seed):
    alice, bob = seed["alice"], seed["bob"]
    _ticket(db_session, seed, "a1", owner=alice)
    _ticket(db_session, seed, "a2 overdue", owner=alice, due_in_hours=-5)
    fast = _ticket(db_session, seed, "a3", owner=alice)
    _resolve(db_session, seed, fast, after_hours=2, first_response_after_hours=0.5)
    # Due 10h after creation, resolved after 12h: a missed SLA.
    late = _ticket(db_session, seed, "a4", owner=alice, due_in_hours=-100, age_hours=110)
    _resolve(db_session, seed, late, after_hours=12, first_response_after_hours=1.5)
    _ticket(db_session, seed, "b1", owner=bob)
    _ticket(db_session, seed, "nobody's")

    rows = TestClient(app).get("/api/analytics/people", headers=HEADERS).json()
    by_name = {r["owner_name"]: r for r in rows}
    assert [r["owner_name"] for r in rows] == ["Alice", "Bob", "Unassigned"]
    assert by_name["Alice"] == {
        "owner_id": alice.id,
        "owner_name": "Alice",
        "open": 2,
        "overdue": 1,
        "resolved": 2,
        "median_resolution_hours": 7.0,
        "median_first_response_hours": 1.0,
        "sla_met_pct": 50.0,
    }
    assert by_name["Bob"]["resolved"] == 0 and by_name["Bob"]["sla_met_pct"] is None
    assert by_name["Unassigned"]["open"] == 1


def test_aging_endpoint(db_session, seed):
    _ticket(db_session, seed, "fresh", age_hours=1)
    rows = TestClient(app).get("/api/analytics/aging", headers=HEADERS).json()
    assert rows[0] == {"key": "under_1d", "label": "Under 1 day", "count": 1, "sla_breached": 0}
