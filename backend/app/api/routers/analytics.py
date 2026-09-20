from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_ticket_filters
from app.core.database import get_db
from app.schemas.analytics import BreakdownItem, DashboardSummary, OwnerPendingItem
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
