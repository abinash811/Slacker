"""Dashboard analytics (spec section 8-9).

V1 ticket volumes are small (an internal support desk, not a high-volume
SaaS), so this loads the filtered ticket set once and aggregates in Python
rather than writing several hand-tuned GROUP BY queries. This keeps the
logic easy to read/verify and reuses `sla_service.sla_status` directly, so
"breached" can never mean something subtly different here than it does on
a single ticket's detail page. If ticket volume grows enough for this to
matter, replace the aggregation body with SQL `GROUP BY` — the public
functions' signatures would not need to change.
"""

from dataclasses import replace
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import TicketStatus
from app.models.ticket import Ticket
from app.schemas.analytics import BreakdownItem, DashboardSummary, OwnerPendingItem, PeriodComparison
from app.services import period, sla_service
from app.services.filters import TicketFilters
from app.services.filters import apply as apply_filters
from app.services.ticket_service import TICKET_LOAD_OPTIONS

RESOLVED_STATUSES = {TicketStatus.RESOLVED, TicketStatus.CLOSED}


def _load(db: Session, filters: TicketFilters, now: datetime) -> list[Ticket]:
    stmt = select(Ticket).options(*TICKET_LOAD_OPTIONS)
    stmt = apply_filters(stmt, filters, now)
    return list(db.execute(stmt).unique().scalars().all())


def _avg_hours(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def dashboard_summary(db: Session, filters: TicketFilters) -> DashboardSummary:
    now = datetime.now(timezone.utc)
    tickets = _load(db, filters, now)

    total_open = sum(1 for t in tickets if t.status not in RESOLVED_STATUSES)
    total_resolved = sum(1 for t in tickets if t.resolved_at is not None)
    tickets_pending = sum(1 for t in tickets if t.status == TicketStatus.PENDING)

    resolution_hours = [
        (t.resolved_at - t.created_at).total_seconds() / 3600 for t in tickets if t.resolved_at is not None
    ]
    first_response_hours = [
        (t.first_response_at - t.created_at).total_seconds() / 3600 for t in tickets if t.first_response_at is not None
    ]

    breached_flags = [sla_service.sla_status(t.sla_due_at, t.resolved_at, now)[0] for t in tickets]
    sla_breached_tickets = sum(breached_flags)

    resolved_tickets = [t for t in tickets if t.resolved_at is not None]
    compliant = sum(1 for t in resolved_tickets if t.resolved_at <= t.sla_due_at)
    sla_compliance_pct = round(compliant / len(resolved_tickets) * 100, 1) if resolved_tickets else None

    # Week-over-week comparisons ignore date-range/SLA-status filters (those
    # define a single snapshot) but keep team/owner/category/priority/status
    # narrowing, so "Team = Product" still scopes the comparison.
    comparison_filters = replace(filters, date_from=None, date_to=None, sla_status=None)
    comparison_tickets = _load(db, comparison_filters, now) if filters != comparison_filters else tickets

    this_week_start, this_week_end = period.week_bounds(now, 0)
    last_week_start, last_week_end = period.week_bounds(now, 1)

    def in_range(ts: datetime | None, start: datetime, end: datetime) -> bool:
        return ts is not None and start <= ts < end

    created_this_week = sum(1 for t in comparison_tickets if in_range(t.created_at, this_week_start, this_week_end))
    created_last_week = sum(1 for t in comparison_tickets if in_range(t.created_at, last_week_start, last_week_end))
    resolved_this_week = sum(1 for t in comparison_tickets if in_range(t.resolved_at, this_week_start, this_week_end))
    resolved_last_week = sum(1 for t in comparison_tickets if in_range(t.resolved_at, last_week_start, last_week_end))

    # A breach is attributed to the week its SLA came due (see docs/API.md).
    breached_this_week = sum(
        1
        for t in comparison_tickets
        if in_range(t.sla_due_at, this_week_start, this_week_end) and sla_service.sla_status(t.sla_due_at, t.resolved_at, now)[0]
    )
    breached_last_week = sum(
        1
        for t in comparison_tickets
        if in_range(t.sla_due_at, last_week_start, last_week_end) and sla_service.sla_status(t.sla_due_at, t.resolved_at, now)[0]
    )

    return DashboardSummary(
        total_open_tickets=total_open,
        total_resolved_tickets=total_resolved,
        avg_resolution_hours=_avg_hours(resolution_hours),
        avg_first_response_hours=_avg_hours(first_response_hours),
        sla_compliance_pct=sla_compliance_pct,
        sla_breached_tickets=sla_breached_tickets,
        tickets_pending=tickets_pending,
        tickets_created_this_week=created_this_week,
        tickets_created_last_week=created_last_week,
        tickets_resolved_this_week=resolved_this_week,
        tickets_resolved_last_week=resolved_last_week,
        sla_breached_this_week=breached_this_week,
        sla_breached_last_week=breached_last_week,
        created_comparison=PeriodComparison(
            current=created_this_week, previous=created_last_week, change_pct=period.pct_change(created_this_week, created_last_week)
        ),
        resolved_comparison=PeriodComparison(
            current=resolved_this_week, previous=resolved_last_week, change_pct=period.pct_change(resolved_this_week, resolved_last_week)
        ),
        sla_breach_comparison=PeriodComparison(
            current=breached_this_week, previous=breached_last_week, change_pct=period.pct_change(breached_this_week, breached_last_week)
        ),
    )


def breakdown_by_team(db: Session, filters: TicketFilters) -> list[BreakdownItem]:
    return _breakdown(db, filters, key_fn=lambda t: (str(t.team_id), t.team.name))


def breakdown_by_category(db: Session, filters: TicketFilters) -> list[BreakdownItem]:
    return _breakdown(db, filters, key_fn=lambda t: (str(t.category_id), t.category.name))


def breakdown_by_priority(db: Session, filters: TicketFilters) -> list[BreakdownItem]:
    return _breakdown(db, filters, key_fn=lambda t: (t.priority.value, t.priority.value.title()))


def owner_pending(db: Session, filters: TicketFilters) -> list[OwnerPendingItem]:
    now = datetime.now(timezone.utc)
    tickets = [t for t in _load(db, filters, now) if t.status not in RESOLVED_STATUSES]
    counts: dict[int | None, tuple[str, int]] = {}
    for t in tickets:
        key = t.owner_id
        name = t.owner.name if t.owner else "Unassigned"
        current = counts.get(key, (name, 0))
        counts[key] = (name, current[1] + 1)
    return [
        OwnerPendingItem(owner_id=owner_id, owner_name=name, pending_count=count)
        for owner_id, (name, count) in sorted(counts.items(), key=lambda kv: -kv[1][1])
    ]


def _breakdown(db: Session, filters: TicketFilters, key_fn) -> list[BreakdownItem]:
    now = datetime.now(timezone.utc)
    tickets = _load(db, filters, now)
    groups: dict[str, dict] = {}
    for t in tickets:
        key, label = key_fn(t)
        group = groups.setdefault(key, {"label": label, "tickets": []})
        group["tickets"].append(t)

    items = []
    for key, group in groups.items():
        group_tickets: list[Ticket] = group["tickets"]
        pending = sum(1 for t in group_tickets if t.status not in RESOLVED_STATUSES)
        breached = sum(1 for t in group_tickets if sla_service.sla_status(t.sla_due_at, t.resolved_at, now)[0])
        resolution_hours = [
            (t.resolved_at - t.created_at).total_seconds() / 3600 for t in group_tickets if t.resolved_at is not None
        ]
        items.append(
            BreakdownItem(
                key=key,
                label=group["label"],
                total=len(group_tickets),
                pending=pending,
                sla_breached=breached,
                avg_resolution_hours=_avg_hours(resolution_hours),
            )
        )
    return sorted(items, key=lambda i: -i.total)
