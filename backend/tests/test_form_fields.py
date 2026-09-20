import pytest
from fastapi import HTTPException

from app.models.custom_field import CustomFieldType
from app.models.enums import EventSource, TicketPriority
from app.services import custom_field_service, lookup_service, ticket_service


def test_category_archive_hides_from_default_listing(db_session, seed):
    lookup_service.update_category(db_session, seed["category"].id, is_archived=True)

    assert seed["category"].id not in [c.id for c in lookup_service.list_categories(db_session)]
    assert seed["category"].id in [c.id for c in lookup_service.list_categories(db_session, include_archived=True)]


def test_sla_policy_archive_hides_from_default_listing(db_session, seed):
    lookup_service.update_sla_policy(db_session, seed["sla_48h"].id, is_archived=True)

    assert seed["sla_48h"].id not in [p.id for p in lookup_service.list_sla_policies(db_session)]


def test_dropdown_custom_field_requires_options(db_session):
    with pytest.raises(HTTPException):
        custom_field_service.create_definition(db_session, label="Region", field_type=CustomFieldType.DROPDOWN, options=None)


def test_create_text_custom_field(db_session):
    field = custom_field_service.create_definition(db_session, label="Business ID", field_type=CustomFieldType.TEXT, options=None)
    assert field.options is None
    assert field.is_archived is False


def test_ticket_stores_and_returns_custom_field_values(db_session, seed):
    field = custom_field_service.create_definition(
        db_session, label="Business ID", field_type=CustomFieldType.TEXT, options=None
    )

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
        custom_field_values=[(field.id, "BUS-1234")],
    )

    assert len(ticket.custom_field_values) == 1
    assert ticket.custom_field_values[0].value == "BUS-1234"
    assert ticket.custom_field_values[0].field_definition.label == "Business ID"


def test_archiving_custom_field_excludes_it_from_default_listing(db_session):
    field = custom_field_service.create_definition(db_session, label="Doctor ID", field_type=CustomFieldType.TEXT, options=None)
    custom_field_service.update_definition(db_session, field.id, is_archived=True)

    assert field.id not in [f.id for f in custom_field_service.list_definitions(db_session)]
    assert field.id in [f.id for f in custom_field_service.list_definitions(db_session, include_archived=True)]
