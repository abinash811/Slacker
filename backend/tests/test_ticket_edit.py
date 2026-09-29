from fastapi.testclient import TestClient

from app.main import app
from app.models.category import Category
from app.models.custom_field import CustomFieldType
from app.models.enums import EventSource, TicketPriority
from app.services import custom_field_service, ticket_service

CREATOR = {"X-Dev-User-Email": "creator@example.com"}


def _ticket(db, seed, **overrides):
    kwargs = dict(
        title="Login broken",
        description="Can't log in",
        customer="ABT pvt ltd",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.MEDIUM,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    kwargs.update(overrides)
    return ticket_service.create_ticket(db, **kwargs)


def test_edit_changes_only_sent_fields_and_logs_them(db_session, seed):
    ticket = _ticket(db_session, seed, business_id="B-1")
    client = TestClient(app)

    response = client.patch(
        f"/api/tickets/{ticket.id}",
        json={"customer": "ABT Private Ltd", "doctor_name": "Dr. Rao", "business_id": None},
        headers=CREATOR,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["customer"] == "ABT Private Ltd"
    assert body["doctor_name"] == "Dr. Rao"
    assert body["business_id"] is None
    assert body["title"] == "Login broken"

    timeline = client.get(f"/api/tickets/{ticket.id}/timeline", headers=CREATOR).json()
    edits = [e for e in timeline if e["event_type"] == "details_edited"]
    assert [e["description"] for e in edits] == ["Edited Business name, Business ID, Doctor name"]
    assert edits[0]["actor_name"] == "Creator"


def test_edit_with_no_real_change_logs_nothing(db_session, seed):
    ticket = _ticket(db_session, seed)
    client = TestClient(app)

    client.patch(f"/api/tickets/{ticket.id}", json={"title": "Login broken"}, headers=CREATOR)

    timeline = client.get(f"/api/tickets/{ticket.id}/timeline", headers=CREATOR).json()
    assert not [e for e in timeline if e["event_type"] == "details_edited"]


def test_required_fields_cannot_be_cleared(db_session, seed):
    ticket = _ticket(db_session, seed)
    response = TestClient(app).patch(f"/api/tickets/{ticket.id}", json={"customer": "   "}, headers=CREATOR)
    assert response.status_code == 400


def test_edit_category_and_custom_fields(db_session, seed):
    other = Category(name="Billing")
    db_session.add(other)
    db_session.commit()
    plan = custom_field_service.create_definition(db_session, label="Plan", field_type=CustomFieldType.TEXT, options=None)
    region = custom_field_service.create_definition(db_session, label="Region", field_type=CustomFieldType.TEXT, options=None)
    ticket = _ticket(db_session, seed, custom_field_values=[(plan.id, "Basic"), (region.id, "North")])

    response = TestClient(app).patch(
        f"/api/tickets/{ticket.id}",
        json={
            "category_id": other.id,
            "custom_field_values": [
                {"field_definition_id": plan.id, "value": "Pro"},
                {"field_definition_id": region.id, "value": ""},
            ],
        },
        headers=CREATOR,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["category"]["name"] == "Billing"
    assert body["custom_field_values"] == [{"field_definition_id": plan.id, "label": "Plan", "value": "Pro"}]
