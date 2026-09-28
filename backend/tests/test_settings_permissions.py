import pytest
from fastapi.testclient import TestClient

from app.models.role import Role
from app.models.team import Team, TeamMember
from app.models.user import User


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


def as_user(email):
    return {"X-Dev-User-Email": email}


@pytest.fixture
def org(db_session, seed):
    """Manager (all perms), Lead (create only), Member (none), plus an outsider with no team."""
    manager_role = Role(name="Manager", can_create_settings=True, can_edit_settings=True, can_delete_settings=True)
    lead_role = Role(name="Lead", can_create_settings=True)
    member_role = Role(name="Member")
    team = Team(name="Support", is_default=True)
    manager = User(email="manager@example.com", name="Manager")
    lead = User(email="lead@example.com", name="Lead")
    member = User(email="member@example.com", name="Member")
    outsider = User(email="outsider@example.com", name="Outsider")
    db_session.add_all([manager_role, lead_role, member_role, team, manager, lead, member, outsider])
    db_session.flush()
    db_session.add_all(
        [
            TeamMember(team_id=team.id, user_id=manager.id, role_id=manager_role.id),
            TeamMember(team_id=team.id, user_id=lead.id, role_id=lead_role.id),
            TeamMember(team_id=team.id, user_id=member.id, role_id=member_role.id),
        ]
    )
    db_session.commit()
    return {
        "team": team,
        "roles": {"manager": manager_role, "lead": lead_role, "member": member_role},
        "users": {"manager": manager, "lead": lead, "member": member, "outsider": outsider},
    }


def test_fresh_install_is_open_so_the_first_admin_can_be_set_up(client, seed):
    r = client.post("/api/tags", json={"name": "Billing"}, headers=as_user("alice@example.com"))
    assert r.status_code == 201


def test_member_without_permissions_is_blocked_everywhere(client, org):
    h = as_user("member@example.com")
    assert client.post("/api/tags", json={"name": "x"}, headers=h).status_code == 403
    assert client.post("/api/categories", json={"name": "x"}, headers=h).status_code == 403
    assert client.post("/api/teams", json={"name": "x"}, headers=h).status_code == 403
    assert client.patch("/api/sla-settings", json={"default_hours": 12}, headers=h).status_code == 403
    assert client.post(f"/api/teams/{org['team'].id}/set-default", headers=h).status_code == 403
    r = client.post("/api/roles", json={"name": "x"}, headers=h)
    assert r.status_code == 403
    assert "Settings admin" in r.json()["detail"]


def test_reading_settings_stays_open(client, org):
    h = as_user("outsider@example.com")
    for path in ["/api/tags", "/api/categories", "/api/roles", "/api/teams", "/api/custom-fields", "/api/sla-settings"]:
        assert client.get(path, headers=h).status_code == 200, path


def test_each_action_needs_its_own_permission(client, org):
    lead = as_user("lead@example.com")
    tag = client.post("/api/tags", json={"name": "Refund"}, headers=lead)
    assert tag.status_code == 201  # create: allowed
    tag_id = tag.json()["id"]
    assert client.patch(f"/api/tags/{tag_id}", json={"name": "Refunds"}, headers=lead).status_code == 403  # edit
    assert client.patch(f"/api/tags/{tag_id}", json={"is_archived": True}, headers=lead).status_code == 403  # delete

    manager = as_user("manager@example.com")
    assert client.patch(f"/api/tags/{tag_id}", json={"name": "Refunds"}, headers=manager).status_code == 200
    assert client.patch(f"/api/tags/{tag_id}", json={"is_archived": True}, headers=manager).status_code == 200


def test_removing_a_member_needs_delete(client, org, db_session):
    member_row = db_session.query(TeamMember).filter_by(user_id=org["users"]["member"].id).one()
    url = f"/api/teams/{org['team'].id}/members/{member_row.id}"
    assert client.delete(url, headers=as_user("lead@example.com")).status_code == 403
    assert client.delete(url, headers=as_user("manager@example.com")).status_code == 204


def test_cannot_grant_permissions_you_do_not_hold(client, org):
    lead = as_user("lead@example.com")
    # Creating a role with only what you have is fine; adding more is not.
    assert client.post("/api/roles", json={"name": "Helper", "can_create_settings": True}, headers=lead).status_code == 201
    r = client.post("/api/roles", json={"name": "Boss", "can_delete_settings": True}, headers=lead)
    assert r.status_code == 403
    assert "delete" in r.json()["detail"]

    # Nor can you put yourself (or anyone) in a more powerful role.
    team_id = org["team"].id
    outsider_id = org["users"]["outsider"].id
    manager_role = org["roles"]["manager"].id
    member_role = org["roles"]["member"].id
    assert (
        client.post(f"/api/teams/{team_id}/members", json={"user_id": outsider_id, "role_id": manager_role}, headers=lead).status_code
        == 403
    )
    assert (
        client.post(f"/api/teams/{team_id}/members", json={"user_id": outsider_id, "role_id": member_role}, headers=lead).status_code
        == 201
    )


def test_archived_roles_grant_nothing(client, org, db_session):
    org["roles"]["lead"].is_archived = True
    db_session.commit()
    assert client.post("/api/tags", json={"name": "x"}, headers=as_user("lead@example.com")).status_code == 403


def test_me_reports_permissions(client, org):
    assert client.get("/api/me", headers=as_user("lead@example.com")).json()["settings"] == {
        "create": True,
        "edit": False,
        "delete": False,
    }
    body = client.get("/api/me", headers=as_user("manager@example.com")).json()
    assert body["user"]["email"] == "manager@example.com"
    assert body["settings"] == {"create": True, "edit": True, "delete": True}
