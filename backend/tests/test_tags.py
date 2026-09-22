import pytest
from fastapi import HTTPException

from app.models.enums import EventSource, TicketPriority
from app.services import tag_service, ticket_service


def test_create_tag(db_session):
    tag = tag_service.create_tag(db_session, "Appointment")
    assert tag.name == "Appointment"
    assert tag.is_archived is False


def test_duplicate_tag_name_rejected(db_session):
    tag_service.create_tag(db_session, "Appointment")
    with pytest.raises(HTTPException):
        tag_service.create_tag(db_session, "Appointment")


def test_archiving_tag_excludes_it_from_default_listing(db_session):
    tag = tag_service.create_tag(db_session, "Prescription")
    tag_service.update_tag(db_session, tag.id, is_archived=True)

    assert tag.id not in [t.id for t in tag_service.list_tags(db_session)]
    assert tag.id in [t.id for t in tag_service.list_tags(db_session, include_archived=True)]


def test_ticket_can_have_multiple_tags(db_session, seed):
    appointment = tag_service.create_tag(db_session, "Appointment")
    prescription = tag_service.create_tag(db_session, "Prescription")

    ticket = ticket_service.create_ticket(
        db_session,
        title="Issue",
        description="desc",
        customer="Acme",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.MEDIUM,
        sla_policy_id=seed["sla_48h"].id,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
        tag_ids=[appointment.id, prescription.id],
    )

    assert {t.name for t in ticket.tags} == {"Appointment", "Prescription"}


def test_update_tags_replaces_the_full_set(db_session, seed):
    appointment = tag_service.create_tag(db_session, "Appointment")
    prescription = tag_service.create_tag(db_session, "Prescription")

    ticket = ticket_service.create_ticket(
        db_session,
        title="Issue",
        description="desc",
        customer="Acme",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.MEDIUM,
        sla_policy_id=seed["sla_48h"].id,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
        tag_ids=[appointment.id],
    )

    ticket_service.update_tags(db_session, ticket, [prescription.id], seed["creator"], EventSource.DASHBOARD)
    ticket = ticket_service.get_ticket_or_404(db_session, ticket.id)
    assert [t.name for t in ticket.tags] == ["Prescription"]

    ticket_service.update_tags(db_session, ticket, [], seed["creator"], EventSource.DASHBOARD)
    ticket = ticket_service.get_ticket_or_404(db_session, ticket.id)
    assert ticket.tags == []
