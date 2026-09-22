from app.models.enums import EventSource, TicketPriority
from app.services import ticket_service
from app.services.filters import TicketFilters


def _create_ticket(db, seed, **overrides):
    kwargs = dict(
        title="Prescription issue",
        description="Not syncing",
        customer="ABC Clinic",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.HIGH,
        sla_policy_id=seed["sla_48h"].id,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    kwargs.update(overrides)
    return ticket_service.create_ticket(db, **kwargs)


def test_search_matches_business_id(db_session, seed):
    match = _create_ticket(db_session, seed, business_id="BUS-4821")
    _create_ticket(db_session, seed, business_id="BUS-9999")

    items, total = ticket_service.list_tickets(db_session, TicketFilters(search="4821"))
    assert total == 1
    assert items[0].id == match.id


def test_search_matches_mobile_number(db_session, seed):
    match = _create_ticket(db_session, seed, mobile_number="+1-555-0142")
    _create_ticket(db_session, seed, mobile_number="+1-555-9999")

    items, total = ticket_service.list_tickets(db_session, TicketFilters(search="0142"))
    assert total == 1
    assert items[0].id == match.id


def test_search_matches_doctor_name_case_insensitively(db_session, seed):
    match = _create_ticket(db_session, seed, doctor_name="Dr. Priya Sharma")

    items, total = ticket_service.list_tickets(db_session, TicketFilters(search="priya"))
    assert total == 1
    assert items[0].id == match.id


def test_search_with_no_match_returns_empty(db_session, seed):
    _create_ticket(db_session, seed, business_id="BUS-1")

    items, total = ticket_service.list_tickets(db_session, TicketFilters(search="nonexistent"))
    assert total == 0
    assert items == []
