from datetime import timedelta

from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.services import ticket_service


def _create_ticket(db, seed, **overrides):
    kwargs = dict(
        title="Prescription issue",
        description="Not syncing",
        customer="ABC Clinic",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.HIGH,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    kwargs.update(overrides)
    return ticket_service.create_ticket(db, **kwargs)


def test_create_ticket_assigns_sequential_number_and_defaults(db_session, seed):
    ticket = _create_ticket(db_session, seed)

    assert ticket.ticket_number >= 1000
    assert ticket.status == TicketStatus.OPEN
    assert ticket.priority == TicketPriority.HIGH
    assert ticket.owner is None
    assert ticket.resolved_at is None
    assert ticket.sla_due_at == ticket.created_at + timedelta(hours=48)


def test_create_ticket_with_owner_records_initial_assignment(db_session, seed):
    ticket = _create_ticket(db_session, seed, owner_id=seed["alice"].id)

    timeline = ticket_service.get_timeline(db_session, ticket)
    assigned_events = [e for e in timeline if e.event_type == "assigned"]
    assert len(assigned_events) == 1
    assert "Alice" in assigned_events[0].description


def test_assign_then_reassign_records_full_history(db_session, seed):
    ticket = _create_ticket(db_session, seed)

    ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["creator"], EventSource.DASHBOARD)
    ticket_service.assign_ticket(db_session, ticket, seed["bob"], seed["creator"], EventSource.DASHBOARD)

    assert ticket.owner_id == seed["bob"].id

    timeline = ticket_service.get_timeline(db_session, ticket)
    assigned = [e for e in timeline if e.event_type == "assigned"]
    assert len(assigned) == 2
    assert "Alice" in assigned[0].description
    assert "Reassigned to Bob" in assigned[1].description
    assert "from Alice" in assigned[1].description


def test_assigning_same_owner_is_a_no_op(db_session, seed):
    ticket = _create_ticket(db_session, seed, owner_id=seed["alice"].id)

    ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["creator"], EventSource.DASHBOARD)

    timeline = ticket_service.get_timeline(db_session, ticket)
    assigned = [e for e in timeline if e.event_type == "assigned"]
    assert len(assigned) == 1  # the no-op reassignment did not add a second row


def test_status_change_is_recorded_and_ignores_no_op(db_session, seed):
    ticket = _create_ticket(db_session, seed)

    ticket_service.change_status(db_session, ticket, TicketStatus.IN_PROGRESS, seed["creator"], EventSource.DASHBOARD)
    ticket_service.change_status(db_session, ticket, TicketStatus.IN_PROGRESS, seed["creator"], EventSource.DASHBOARD)
    ticket_service.change_status(db_session, ticket, TicketStatus.PENDING, seed["creator"], EventSource.DASHBOARD)

    timeline = ticket_service.get_timeline(db_session, ticket)
    status_events = [e for e in timeline if e.event_type == "status_changed"]
    assert [e.description for e in status_events] == [
        "Status changed to In Progress",
        "Status changed to Pending",
    ]


def test_resolve_sets_resolved_at_and_reopen_clears_it(db_session, seed):
    ticket = _create_ticket(db_session, seed)

    ticket_service.resolve_ticket(db_session, ticket, seed["creator"], EventSource.DASHBOARD)
    assert ticket.status == TicketStatus.RESOLVED
    assert ticket.resolved_at is not None

    ticket_service.change_status(db_session, ticket, TicketStatus.OPEN, seed["creator"], EventSource.DASHBOARD)
    assert ticket.resolved_at is None


def test_priority_change_recorded_and_no_op_skipped(db_session, seed):
    ticket = _create_ticket(db_session, seed, priority=TicketPriority.MEDIUM)

    ticket_service.change_priority(db_session, ticket, TicketPriority.MEDIUM, seed["creator"], EventSource.DASHBOARD)
    ticket_service.change_priority(db_session, ticket, TicketPriority.URGENT, seed["creator"], EventSource.DASHBOARD)

    timeline = ticket_service.get_timeline(db_session, ticket)
    priority_events = [e for e in timeline if e.event_type == "priority_changed"]
    assert len(priority_events) == 1
    assert priority_events[0].description == "Priority changed to Urgent"


def test_comment_reference_sets_first_response_once(db_session, seed):
    ticket = _create_ticket(db_session, seed)
    assert ticket.first_response_at is None

    ticket_service.record_comment_reference(db_session, ticket, seed["alice"], "1234.5678", EventSource.SLACK)
    first_response = ticket.first_response_at
    assert first_response is not None

    ticket_service.record_comment_reference(db_session, ticket, seed["bob"], "1234.9999", EventSource.SLACK)
    assert ticket.first_response_at == first_response  # unchanged by later replies


def test_find_ticket_by_slack_message(db_session, seed):
    ticket = _create_ticket(db_session, seed)
    ticket.slack_channel_id = "C123"
    ticket.slack_message_ts = "111.222"
    db_session.commit()

    found = ticket_service.find_ticket_by_slack_message(db_session, "C123", "111.222")
    assert found is not None
    assert found.id == ticket.id

    assert ticket_service.find_ticket_by_slack_message(db_session, "C999", "000.000") is None
