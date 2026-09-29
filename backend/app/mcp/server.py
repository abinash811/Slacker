"""MCP server: lets people analyse tickets from Claude (or any MCP client).

Read-only by design. Every tool calls the same services the dashboard uses,
so numbers match the Dashboard exactly. Each request is authenticated with a
personal key from the Connect page (see app/mcp/asgi.py); tools read the
caller from the HTTP request.
"""

from datetime import date, datetime, time, timezone
from typing import Annotated, Literal

from mcp.server import MCPServer
from mcp.server.mcpserver import Context
from mcp.server.mcpserver.exceptions import ToolError
from mcp_types import ToolAnnotations
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.serializers import to_list_item, to_ticket_out
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.enums import TicketPriority, TicketStatus
from app.models.tag import Tag
from app.models.team import Team
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.analytics import (
    AgingBucket,
    BreakdownItem,
    DashboardSummary,
    OwnerPendingItem,
    PersonScore,
    WeeklyTrend,
)
from app.schemas.ticket import TicketListItem, TicketOut, TimelineEvent
from app.services import analytics_service, ticket_service
from app.services.filters import TicketFilters
from app.services.slack_service import build_permalink

INSTRUCTIONS = """\
Support tickets from the Slacker support desk. Each ticket has a number
(#1042), a business (the customer), an owner ("pending on"), a team, a
category, a priority, a status and an SLA deadline. Tickets can have
sub-issues (one level). Resolved and closed tickets are "done"; everything
else is ongoing.

Start with list_reference_data to learn the exact team, category and people
names. Use search_tickets to find tickets and get_ticket for one ticket's full
history. For analysis use get_summary, get_breakdown and get_weekly_trends;
they take the same filters as search_tickets and match the Dashboard. Dates
are calendar days in UTC. Link to tickets with the `url` field."""

READ_ONLY = ToolAnnotations(read_only_hint=True, open_world_hint=False)

mcp = MCPServer("Slacker", title="Slacker support desk", instructions=INSTRUCTIONS)


# --- shared filter arguments ---------------------------------------------------

Text = Annotated[str | None, Field(description="Matches ticket number, title, business name, Business ID, mobile number or doctor name.")]
State = Annotated[Literal["ongoing", "done", "any"], Field(description="ongoing = not resolved or closed; done = resolved or closed.")]
Status = Annotated[TicketStatus | None, Field(description="An exact status. Usually `state` is what you want.")]
Priority = Annotated[TicketPriority | None, Field(description="Ticket priority.")]
TeamName = Annotated[str | None, Field(description="Team name, as in list_reference_data.")]
CategoryName = Annotated[str | None, Field(description="Category name, as in list_reference_data.")]
Person = Annotated[str | None, Field(description='Who the ticket is pending on: a name, an email, or "me".')]
SupportPerson = Annotated[str | None, Field(description='The support owner: a name, an email, or "me".')]
Sla = Annotated[
    Literal["breached", "on_track", "due_within_24h"] | None,
    Field(description="SLA state. due_within_24h: ongoing and not yet breached, but due in the next 24 hours."),
]
CreatedFrom = Annotated[date | None, Field(description="Created on or after this day (YYYY-MM-DD).")]
CreatedTo = Annotated[date | None, Field(description="Created on or before this day (YYYY-MM-DD).")]


def _caller(ctx: Context) -> int:
    request = ctx.request_context.request
    user_id = getattr(request.state, "user_id", None) if request is not None else None
    if user_id is None:  # the ASGI layer rejects unauthenticated calls, so this is a bug
        raise ToolError("Not signed in. Create a key on the Connect page and add it to your MCP client.")
    return user_id


def _find(db: Session, model, name: str | None, kind: str):
    if not name:
        return None
    row = db.execute(select(model).where(func.lower(model.name) == name.strip().lower())).scalar_one_or_none()
    if row is None:
        names = ", ".join(db.execute(select(model.name).order_by(model.name)).scalars())
        raise ToolError(f"No {kind} named {name!r}. {kind.title()}s: {names or 'none yet'}.")
    return row


def _person(db: Session, who: str | None, caller_id: int) -> int | None:
    if not who:
        return None
    if who.strip().lower() == "me":
        return caller_id
    needle = who.strip().lower()
    matches = db.execute(
        select(User).where((func.lower(User.email) == needle) | (func.lower(User.name).contains(needle)))
    ).scalars().all()
    if len(matches) == 1:
        return matches[0].id
    if not matches:
        raise ToolError(f"No person matches {who!r}. Use list_reference_data to see everyone.")
    raise ToolError(f"{who!r} matches several people: {', '.join(u.name for u in matches)}. Use an email.")


def _filters(
    db: Session,
    caller_id: int,
    *,
    text=None,
    state="any",
    status=None,
    priority=None,
    team=None,
    category=None,
    pending_on=None,
    support_owner=None,
    sla=None,
    created_from=None,
    created_to=None,
) -> TicketFilters:
    team_row = _find(db, Team, team, "team")
    category_row = _find(db, Category, category, "category")
    return TicketFilters(
        team_id=team_row.id if team_row else None,
        category_id=category_row.id if category_row else None,
        owner_id=_person(db, pending_on, caller_id),
        support_assignee_id=_person(db, support_owner, caller_id),
        priority=priority,
        status=status,
        state={"ongoing": "active", "done": "done"}.get(state),
        sla_status={"breached": "breached", "on_track": "ok", "due_within_24h": "at_risk"}.get(sla) if sla else None,
        date_from=datetime.combine(created_from, time.min, timezone.utc) if created_from else None,
        date_to=datetime.combine(created_to, time.max, timezone.utc) if created_to else None,
        search=text or None,
    )


def _ticket_url(ticket_id: int) -> str:
    return f"{get_settings().public_app_url.rstrip('/')}/tickets/{ticket_id}"


# --- results --------------------------------------------------------------------


class TicketHit(TicketListItem):
    url: str


class SearchResult(BaseModel):
    total: int = Field(description="Tickets matching the filters, across all pages.")
    page: int
    page_size: int
    tickets: list[TicketHit]


class TicketDetail(BaseModel):
    ticket: TicketOut
    url: str
    slack_url: str | None
    timeline: list[TimelineEvent]


class Breakdown(BaseModel):
    by: str
    rows: list[BreakdownItem] | list[OwnerPendingItem] | list[AgingBucket] | list[PersonScore]


class Me(BaseModel):
    name: str
    email: str


class ReferenceData(BaseModel):
    teams: list[str]
    categories: list[str]
    people: list[Me]
    tags: list[str]
    statuses: list[str]
    priorities: list[str]


# --- tools ------------------------------------------------------------------------


@mcp.tool(title="Who am I", annotations=READ_ONLY)
def whoami(ctx: Context) -> Me:
    """The person this connection acts as ("me" in filters)."""
    with SessionLocal() as db:
        user = db.get(User, _caller(ctx))
        return Me(name=user.name, email=user.email)


@mcp.tool(title="List teams, categories and people", annotations=READ_ONLY)
def list_reference_data(ctx: Context) -> ReferenceData:
    """Exact names to use in filters: teams, categories, people, tags, statuses and priorities."""
    _caller(ctx)
    with SessionLocal() as db:
        return ReferenceData(
            teams=list(db.execute(select(Team.name).order_by(Team.name)).scalars()),
            categories=list(db.execute(select(Category.name).where(Category.is_archived.is_(False)).order_by(Category.name)).scalars()),
            people=[Me(name=u.name, email=u.email) for u in db.execute(select(User).order_by(User.name)).scalars()],
            tags=list(db.execute(select(Tag.name).where(Tag.is_archived.is_(False)).order_by(Tag.name)).scalars()),
            statuses=[s.value for s in TicketStatus],
            priorities=[p.value for p in TicketPriority],
        )


@mcp.tool(title="Search tickets", annotations=READ_ONLY)
def search_tickets(
    ctx: Context,
    text: Text = None,
    state: State = "any",
    status: Status = None,
    priority: Priority = None,
    team: TeamName = None,
    category: CategoryName = None,
    pending_on: Person = None,
    support_owner: SupportPerson = None,
    sla: Sla = None,
    created_from: CreatedFrom = None,
    created_to: CreatedTo = None,
    sort_by: Literal["created_at", "updated_at", "sla_due_at", "priority", "status", "ticket_number"] = "created_at",
    sort_dir: Literal["asc", "desc"] = "desc",
    page: Annotated[int, Field(ge=1)] = 1,
    page_size: Annotated[int, Field(ge=1, le=100)] = 25,
) -> SearchResult:
    """Find tickets. Returns one page plus the total; ask for more pages if you need them."""
    caller = _caller(ctx)
    with SessionLocal() as db:
        filters = _filters(
            db, caller, text=text, state=state, status=status, priority=priority, team=team, category=category,
            pending_on=pending_on, support_owner=support_owner, sla=sla, created_from=created_from, created_to=created_to,
        )
        items, total = ticket_service.list_tickets(
            db, filters, sort_by=sort_by, sort_dir=sort_dir, page=page, page_size=page_size
        )
        return SearchResult(
            total=total,
            page=page,
            page_size=page_size,
            tickets=[TicketHit(**to_list_item(t).model_dump(), url=_ticket_url(t.id)) for t in items],
        )


@mcp.tool(title="Get a ticket", annotations=READ_ONLY)
def get_ticket(
    ctx: Context,
    ticket_number: Annotated[int, Field(description="The ticket number people see, e.g. 1042 for #1042.")],
) -> TicketDetail:
    """One ticket in full: details, custom fields, tags, parent and sub-issues, and its timeline (who did what, when)."""
    _caller(ctx)
    with SessionLocal() as db:
        ticket_id = db.execute(select(Ticket.id).where(Ticket.ticket_number == ticket_number)).scalar_one_or_none()
        if ticket_id is None:
            raise ToolError(f"There's no ticket #{ticket_number}.")
        ticket = ticket_service.get_ticket_or_404(db, ticket_id)
        return TicketDetail(
            ticket=to_ticket_out(ticket),
            url=_ticket_url(ticket.id),
            slack_url=build_permalink(ticket),
            timeline=ticket_service.get_timeline(db, ticket),
        )


@mcp.tool(title="Summary numbers", annotations=READ_ONLY)
def get_summary(
    ctx: Context,
    text: Text = None,
    state: State = "any",
    priority: Priority = None,
    team: TeamName = None,
    category: CategoryName = None,
    pending_on: Person = None,
    support_owner: SupportPerson = None,
    created_from: CreatedFrom = None,
    created_to: CreatedTo = None,
) -> DashboardSummary:
    """The Dashboard's numbers: open and resolved counts, average resolution and first-response hours,
    SLA compliance, and this week against last week."""
    caller = _caller(ctx)
    with SessionLocal() as db:
        filters = _filters(
            db, caller, text=text, state=state, priority=priority, team=team, category=category,
            pending_on=pending_on, support_owner=support_owner, created_from=created_from, created_to=created_to,
        )
        return analytics_service.dashboard_summary(db, filters)


@mcp.tool(title="Break down tickets", annotations=READ_ONLY)
def get_breakdown(
    ctx: Context,
    by: Annotated[
        Literal["team", "category", "priority", "pending_on", "age", "person"],
        Field(
            description=(
                "team/category/priority give totals, pending, SLA breaches and average resolution time; "
                "pending_on gives how many ongoing tickets sit with each person; age groups ongoing tickets "
                "by how long they've been open; person is a scorecard per owner (open, overdue, resolved, "
                "median resolution and first-response hours, SLA met %)."
            )
        ),
    ],
    text: Text = None,
    state: State = "any",
    priority: Priority = None,
    team: TeamName = None,
    category: CategoryName = None,
    created_from: CreatedFrom = None,
    created_to: CreatedTo = None,
) -> Breakdown:
    """Ticket counts grouped by team, category, priority or person."""
    caller = _caller(ctx)
    with SessionLocal() as db:
        filters = _filters(
            db, caller, text=text, state=state, priority=priority, team=team, category=category,
            created_from=created_from, created_to=created_to,
        )
        fn = {
            "team": analytics_service.breakdown_by_team,
            "category": analytics_service.breakdown_by_category,
            "priority": analytics_service.breakdown_by_priority,
            "pending_on": analytics_service.owner_pending,
            "age": analytics_service.aging,
            "person": analytics_service.people_scorecard,
        }[by]
        return Breakdown(by=by, rows=fn(db, filters))


@mcp.tool(title="Weekly trends", annotations=READ_ONLY)
def get_weekly_trends(
    ctx: Context,
    weeks: Annotated[int, Field(ge=4, le=26)] = 12,
    priority: Priority = None,
    team: TeamName = None,
    category: CategoryName = None,
    pending_on: Person = None,
) -> list[WeeklyTrend]:
    """Per week (Monday to Sunday, UTC), oldest first: tickets created, resolved, median resolution hours
    and SLA breaches. The current week is still in progress."""
    caller = _caller(ctx)
    with SessionLocal() as db:
        filters = _filters(db, caller, priority=priority, team=team, category=category, pending_on=pending_on)
        return analytics_service.weekly_trends(db, filters, weeks)
