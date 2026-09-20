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


class OwnerPendingItem(BaseModel):
    owner_id: int | None
    owner_name: str
    pending_count: int
