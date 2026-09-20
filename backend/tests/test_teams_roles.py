import pytest
from fastapi import HTTPException

from app.models.role import Role
from app.services import role_service, team_service


@pytest.fixture
def roles(db_session):
    member = Role(name="Member")
    lead = Role(name="Lead", can_create_settings=True)
    manager = Role(name="Manager", can_create_settings=True, can_edit_settings=True, can_delete_settings=True)
    db_session.add_all([member, lead, manager])
    db_session.commit()
    return {"member": member, "lead": lead, "manager": manager}


def test_create_role_rejects_duplicate_name(db_session, roles):
    with pytest.raises(HTTPException):
        role_service.create_role(
            db_session, name="Member", can_create_settings=False, can_edit_settings=False, can_delete_settings=False
        )


def test_archived_role_excluded_by_default(db_session, roles):
    role_service.update_role(db_session, roles["lead"], is_archived=True)

    assert [r.name for r in role_service.list_roles(db_session)] == ["Manager", "Member"]
    assert {r.name for r in role_service.list_roles(db_session, include_archived=True)} == {
        "Member",
        "Lead",
        "Manager",
    }


def test_create_team_rejects_duplicate_name(db_session, seed):
    with pytest.raises(HTTPException):
        team_service.create_team(db_session, seed["team"].name)


def test_add_update_and_remove_member(db_session, seed, roles):
    member = team_service.add_member(db_session, seed["team"].id, seed["alice"].id, roles["member"].id)
    assert member.role.name == "Member"

    updated = team_service.update_member_role(db_session, seed["team"].id, member.id, roles["manager"].id)
    assert updated.role.name == "Manager"

    members = team_service.list_members(db_session, seed["team"].id)
    assert len(members) == 1

    team_service.remove_member(db_session, seed["team"].id, member.id)
    assert team_service.list_members(db_session, seed["team"].id) == []


def test_cannot_add_same_user_twice(db_session, seed, roles):
    team_service.add_member(db_session, seed["team"].id, seed["alice"].id, roles["member"].id)

    with pytest.raises(HTTPException):
        team_service.add_member(db_session, seed["team"].id, seed["alice"].id, roles["lead"].id)
