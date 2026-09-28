from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.models.enums import EventSource, TicketPriority
from app.services import analytics_service, period, ticket_service
from app.services.filters import TicketFilters


def _ticket(db, seed, *, created, resolved=None, sla_due=None):
    t = ticket_service.create_ticket(
        db,
        title="t",
        description="d",
        customer="c",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.MEDIUM,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    t.created_at = created
    t.resolved_at = resolved
    t.sla_due_at = sla_due or created + timedelta(hours=48)
    db.commit()
    return t


def test_weekly_buckets_count_created_resolved_breached_and_median(db_session, seed):
    now = datetime.now(timezone.utc)
    last_week, _ = period.week_bounds(now, 1)
    two_weeks_ago, _ = period.week_bounds(now, 2)
    mid = lambda start: start + timedelta(days=2)  # noqa: E731

    # Two weeks ago: created, resolved in 4h and 10h (within SLA).
    _ticket(db_session, seed, created=mid(two_weeks_ago), resolved=mid(two_weeks_ago) + timedelta(hours=4))
    _ticket(db_session, seed, created=mid(two_weeks_ago), resolved=mid(two_weeks_ago) + timedelta(hours=10))
    # Last week: created; SLA due last week, still open → breached last week.
    _ticket(db_session, seed, created=mid(last_week), sla_due=mid(last_week) + timedelta(hours=1))

    trends = analytics_service.weekly_trends(db_session, TicketFilters(), weeks=4)
    assert len(trends) == 4
    assert [t.week_start for t in trends] == sorted(t.week_start for t in trends)  # oldest first
    by_week = {t.week_start: t for t in trends}

    w2 = by_week[two_weeks_ago]
    assert (w2.created, w2.resolved, w2.median_resolution_hours, w2.sla_breached) == (2, 2, 7.0, 0)
    w1 = by_week[last_week]
    assert (w1.created, w1.resolved, w1.median_resolution_hours, w1.sla_breached) == (1, 0, None, 1)


def test_a_future_deadline_is_not_a_breach_yet(db_session, seed):
    now = datetime.now(timezone.utc)
    _ticket(db_session, seed, created=now - timedelta(minutes=5), sla_due=now + timedelta(hours=1))
    this_week = analytics_service.weekly_trends(db_session, TicketFilters(), weeks=4)[-1]
    assert this_week.sla_breached == 0


def test_date_range_filters_do_not_hide_older_weeks(db_session, seed):
    now = datetime.now(timezone.utc)
    last_week, _ = period.week_bounds(now, 1)
    _ticket(db_session, seed, created=last_week + timedelta(days=1))
    filters = TicketFilters(date_from=now - timedelta(hours=1))
    assert sum(t.created for t in analytics_service.weekly_trends(db_session, filters, weeks=4)) == 1


def test_api_bounds_the_number_of_weeks(seed):
    from app.main import app

    client = TestClient(app)
    assert len(client.get("/api/analytics/trends").json()) == 12
    assert len(client.get("/api/analytics/trends", params={"weeks": 8}).json()) == 8
    assert client.get("/api/analytics/trends", params={"weeks": 2}).status_code == 422
    assert client.get("/api/analytics/trends", params={"weeks": 100}).status_code == 422
