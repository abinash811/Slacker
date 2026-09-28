from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.models.category import Category
from app.models.enums import EventSource, TicketPriority
from app.models.team import Team
from app.services import ticket_service
from app.services.filters import TicketFilters


@pytest.fixture
def tickets(db_session, seed):
    """Three tickets whose names sort differently per column, one with no owner."""
    billing = Category(name="billing")
    appointments = Category(name="Appointments")
    zeta = Team(name="Zeta")
    db_session.add_all([billing, appointments, zeta])
    db_session.flush()

    def make(title, customer, category, team, owner, business_id):
        return ticket_service.create_ticket(
            db_session,
            title=title,
            description="d",
            customer=customer,
            business_id=business_id,
            category_id=category.id,
            team_id=team.id,
            priority=TicketPriority.MEDIUM,
            owner_id=owner.id if owner else None,
            created_by=seed["creator"],
            source=EventSource.DASHBOARD,
        )

    a = make("banana", "Clinic C", billing, seed["team"], seed["bob"], None)
    b = make("Apple", "clinic a", appointments, zeta, None, "b-2")
    c = make("cherry", "Clinic B", appointments, seed["team"], seed["alice"], "b-1")
    return {"a": a, "b": b, "c": c}


def _titles(db, sort_by, sort_dir="asc", **kw):
    items, _ = ticket_service.list_tickets(db, TicketFilters(), sort_by=sort_by, sort_dir=sort_dir, **kw)
    return [t.title for t in items]


@pytest.mark.parametrize(
    "sort_by, expected",
    [
        ("title", ["Apple", "banana", "cherry"]),  # case-insensitive
        ("customer", ["Apple", "cherry", "banana"]),  # clinic a, Clinic B, Clinic C
        ("category_name", ["cherry", "Apple", "banana"]),  # Appointments (id tie-break desc), billing
        ("team_name", ["cherry", "banana", "Apple"]),  # Product (id desc), Zeta
        ("owner_name", ["cherry", "banana", "Apple"]),  # Alice, Bob, then unassigned last
        ("business_id", ["cherry", "Apple", "banana"]),  # b-1, b-2, then empty last
    ],
)
def test_sorts_every_text_column_ascending(db_session, tickets, sort_by, expected):
    assert _titles(db_session, sort_by) == expected


def test_empty_values_sort_last_in_both_directions(db_session, tickets):
    assert _titles(db_session, "owner_name", "desc")[-1] == "Apple"
    assert _titles(db_session, "business_id", "desc")[-1] == "banana"


def test_ties_break_by_id_so_pages_never_overlap(db_session, tickets):
    page1 = _titles(db_session, "priority", page=1, page_size=2)
    page2 = _titles(db_session, "priority", page=2, page_size=2)
    assert len(page1) == 2 and len(page2) == 1
    assert set(page1).isdisjoint(page2)


def test_unknown_sort_column_is_rejected(db_session, seed):
    with pytest.raises(ValueError):
        ticket_service.list_tickets(db_session, TicketFilters(), sort_by="nope")


def test_api_validates_sort_and_paging_params(seed):
    from app.main import app

    client = TestClient(app)
    assert client.get("/api/tickets", params={"sort_by": "team_name"}).status_code == 200
    assert client.get("/api/tickets", params={"sort_by": "description"}).status_code == 422
    assert client.get("/api/tickets", params={"sort_dir": "sideways"}).status_code == 422
    assert client.get("/api/tickets", params={"page_size": 1000}).status_code == 422
