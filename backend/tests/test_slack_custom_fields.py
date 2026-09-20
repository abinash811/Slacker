from app.models.custom_field import CustomFieldDefinition, CustomFieldType
from app.services import custom_field_service, slack_service
from app.slack.bolt_app import _extract_custom_field_values


def test_build_custom_field_block_text():
    field = CustomFieldDefinition(id=7, label="Business ID", field_type=CustomFieldType.TEXT)
    block = slack_service._build_custom_field_block(field)

    assert block["block_id"] == "custom_field_7"
    assert block["element"]["type"] == "plain_text_input"
    assert block["optional"] is True


def test_build_custom_field_block_dropdown():
    field = CustomFieldDefinition(id=9, label="Region", field_type=CustomFieldType.DROPDOWN, options=["North", "South"])
    block = slack_service._build_custom_field_block(field)

    assert block["block_id"] == "custom_field_9"
    assert block["element"]["type"] == "static_select"
    assert [o["value"] for o in block["element"]["options"]] == ["North", "South"]


def test_modal_excludes_archived_custom_fields(db_session):
    active = custom_field_service.create_definition(db_session, label="Business ID", field_type=CustomFieldType.TEXT, options=None)
    archived = custom_field_service.create_definition(db_session, label="Old Field", field_type=CustomFieldType.TEXT, options=None)
    custom_field_service.update_definition(db_session, archived.id, is_archived=True)

    view = slack_service.build_create_ticket_modal(db_session)
    block_ids = [b["block_id"] for b in view["blocks"] if b.get("block_id", "").startswith("custom_field_")]

    assert block_ids == [f"custom_field_{active.id}"]


def test_extract_custom_field_values_handles_text_dropdown_and_empty():
    values = {
        "title": {"value": {"value": "Some title"}},
        "custom_field_1": {"value": {"value": "BUS-1"}},
        "custom_field_2": {"value": {"selected_option": {"value": "East"}}},
        "custom_field_3": {"value": {"value": None}},  # left blank (optional)
    }

    extracted = dict(_extract_custom_field_values(values))

    assert extracted == {1: "BUS-1", 2: "East"}
    assert 3 not in extracted
