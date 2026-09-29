from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_ticket_filters
from app.core.database import get_db
from app.schemas.analytics import (
    AgingBucket,
    BreakdownItem,
    DashboardSummary,
    OwnerPendingItem,
    PersonScore,
    WeeklyTrend,
)
from app.services import analytics_service
from app.services.filters import TicketFilters

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)
) -> DashboardSummary:
    return analytics_service.dashboard_summary(db, filters)


@router.get("/breakdown/team", response_model=list[BreakdownItem])
def breakdown_by_team(
    filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)
) -> list[BreakdownItem]:
    return analytics_service.breakdown_by_team(db, filters)


@router.get("/breakdown/category", response_model=list[BreakdownItem])
def breakdown_by_category(
    filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)
) -> list[BreakdownItem]:
    return analytics_service.breakdown_by_category(db, filters)


@router.get("/breakdown/priority", response_model=list[BreakdownItem])
def breakdown_by_priority(
    filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)
) -> list[BreakdownItem]:
    return analytics_service.breakdown_by_priority(db, filters)


@router.get("/owner-pending", response_model=list[OwnerPendingItem])
def owner_pending(
    filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)
) -> list[OwnerPendingItem]:
    return analytics_service.owner_pending(db, filters)


@router.get("/aging", response_model=list[AgingBucket])
def aging(filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)) -> list[AgingBucket]:
    return analytics_service.aging(db, filters)


@router.get("/people", response_model=list[PersonScore])
def people_scorecard(
    filters: TicketFilters = Depends(get_ticket_filters), db: Session = Depends(get_db)
) -> list[PersonScore]:
    return analytics_service.people_scorecard(db, filters)


@router.get("/trends", response_model=list[WeeklyTrend])
def get_trends(
    weeks: int = Query(12, ge=4, le=26),
    filters: TicketFilters = Depends(get_ticket_filters),
    db: Session = Depends(get_db),
) -> list[WeeklyTrend]:
    return analytics_service.weekly_trends(db, filters, weeks)
