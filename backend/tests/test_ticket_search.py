from datetime import datetime, timedelta, timezone

import pytest

from app.models.enums import EventSource, TicketPriority
from app.services import ticket_service
from app.services.filters import TicketFilters


@pytest.fixture
def tickets(db_session, seed):
    def make(title, customer, **kw):
        return ticket_service.create_ticket(
            db_session,
            title=title,
            description="secret words",
            customer=customer,
            category_id=seed["category"].id,
            team_id=seed["team"].id,
            priority=TicketPriority.MEDIUM,
            owner_id=None,
            created_by=seed["creator"],
            source=EventSource.DASHBOARD,
            **kw,
        )

    a = make("Prescriptions not syncing", "Sunrise Clinic", business_id="b-1721", doctor_name="Dr. Mehta")
    b = make("Invoice mismatch", "Care Plus", mobile_number="98450 12345")
    return a, b


def _search(db, term):
    items, _ = ticket_service.list_tickets(db, TicketFilters(search=term))
    return {t.title for t in items}


@pytest.mark.parametrize(
    "term, expected",
    [
        ("sunrise", {"Prescriptions not syncing"}),  # business name
        ("invoice", {"Invoice mismatch"}),  # title
        ("b-1721", {"Prescriptions not syncing"}),  # Business ID
        ("mehta", {"Prescriptions not syncing"}),  # doctor
        ("98450", {"Invoice mismatch"}),  # mobile
        ("secret", set()),  # description is not searched
    ],
)
def test_search_matches_identifying_fields(db_session, tickets, term, expected):
    assert _search(db_session, term) == expected


def test_search_by_ticket_number_with_or_without_hash(db_session, tickets):
    number = tickets[1].ticket_number
    assert "Invoice mismatch" in _search(db_session, f"#{number}")
    assert "Invoice mismatch" in _search(db_session, str(number))


def test_created_date_range(db_session, tickets):
    old, new = tickets
    old.created_at = datetime.now(timezone.utc) - timedelta(days=10)
    db_session.commit()
    since = datetime.now(timezone.utc) - timedelta(days=2)
    items, total = ticket_service.list_tickets(db_session, TicketFilters(date_from=since))
    assert total == 1 and items[0].id == new.id
    items, _ = ticket_service.list_tickets(db_session, TicketFilters(date_to=since))
    assert [t.id for t in items] == [old.id]
