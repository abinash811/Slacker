from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class PeriodComparison(BaseModel):
    current: float
    previous: float
    change_pct: float | None  # None when previous == 0 (undefined % change)


class DashboardSummary(BaseModel):
    total_open_tickets: int
    total_resolved_tickets: int
    avg_resolution_hours: float | None
    avg_first_response_hours: float | None
    sla_compliance_pct: float | None
    sla_breached_tickets: int
    tickets_pending: int

    tickets_created_this_week: int
    tickets_created_last_week: int
    tickets_resolved_this_week: int
    tickets_resolved_last_week: int
    sla_breached_this_week: int
    sla_breached_last_week: int

    created_comparison: PeriodComparison
    resolved_comparison: PeriodComparison
    sla_breach_comparison: PeriodComparison


class BreakdownItem(BaseModel):
    key: str
    label: str
    total: int
    pending: int
    sla_breached: int
    avg_resolution_hours: float | None


class AgingBucket(BaseModel):
    """Ongoing tickets grouped by how long they've been open."""

    key: Literal["under_1d", "1_3d", "3_7d", "over_7d"]
    label: str
    count: int
    sla_breached: int


class PersonScore(BaseModel):
    """One owner's tickets (by current owner) within the filters."""

    owner_id: int | None
    owner_name: str
    open: int
    overdue: int  # open and past SLA
    resolved: int
    median_resolution_hours: float | None
    median_first_response_hours: float | None
    sla_met_pct: float | None  # resolved within SLA, of resolved


class OwnerPendingItem(BaseModel):
    owner_id: int | None
    owner_name: str
    pending_count: int


class WeeklyTrend(BaseModel):
    """One ISO week (Monday 00:00 UTC) of ticket activity."""

    week_start: datetime
    created: int
    resolved: int
    # Median hours from creation to resolution, for tickets resolved this week.
    # None when nothing was resolved (a gap, not zero).
    median_resolution_hours: float | None
    # Tickets whose SLA deadline fell in this week and was missed.
    sla_breached: int
