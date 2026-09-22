import pytest
from fastapi import HTTPException

from app.models.enums import EventSource, TicketPriority
from app.models.team import Team
from app.services import team_service, ticket_service


@pytest.fixture
def routing(db_session, seed):
    """A default Support team (with Alice as a member) and a non-default
    Sales team (with Bob as a member) — the minimal setup needed to
    exercise team routing + the support-assignee lock.
    """
    from app.models.role import Role

    support = Team(name="Support", is_default=True)
    sales = Team(name="Sales")
    db_session.add_all([support, sales])
    db_session.flush()

    role = Role(name="Member")
    db_session.add(role)
    db_session.flush()

    team_service.add_member(db_session, support.id, seed["alice"].id, role.id)
    team_service.add_member(db_session, sales.id, seed["bob"].id, role.id)

    return {"support": support, "sales": sales}


def _create_ticket(db, seed, team, **overrides):
    kwargs = dict(
        title="Prescription issue",
        description="Not syncing",
        customer="ABC Clinic",
        category_id=seed["category"].id,
        team_id=team.id,
        priority=TicketPriority.HIGH,
        sla_policy_id=seed["sla_48h"].id,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    kwargs.update(overrides)
    return ticket_service.create_ticket(db, **kwargs)


def test_self_assign_on_default_team_locks_support_assignee(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])
    ticket = ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["alice"], EventSource.DASHBOARD)

    assert ticket.owner_id == seed["alice"].id
    assert ticket.support_assignee_id == seed["alice"].id


def test_non_support_member_cannot_assign_on_default_team(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])

    with pytest.raises(HTTPException) as exc:
        ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["bob"], EventSource.DASHBOARD)
    assert exc.value.status_code == 403


def test_cannot_assign_non_support_member_while_on_default_team(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])

    with pytest.raises(HTTPException) as exc:
        ticket_service.assign_ticket(db_session, ticket, seed["bob"], seed["alice"], EventSource.DASHBOARD)
    assert exc.value.status_code == 400


def test_support_member_can_reassign_to_another_support_member(db_session, seed, routing):
    from app.models.role import Role
    from app.models.user import User

    carol = User(email="carol@example.com", name="Carol")
    db_session.add(carol)
    db_session.flush()
    role = db_session.query(Role).first()
    team_service.add_member(db_session, routing["support"].id, carol.id, role.id)

    ticket = _create_ticket(db_session, seed, routing["support"])
    ticket = ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["alice"], EventSource.DASHBOARD)
    ticket = ticket_service.assign_ticket(db_session, ticket, carol, seed["alice"], EventSource.DASHBOARD)

    assert ticket.owner_id == carol.id
    assert ticket.support_assignee_id == carol.id


def test_change_team_away_from_support_clears_assignee(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])
    ticket = ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["alice"], EventSource.DASHBOARD)

    ticket = ticket_service.change_team(db_session, ticket, routing["sales"], seed["alice"], EventSource.DASHBOARD)

    assert ticket.team_id == routing["sales"].id
    assert ticket.owner_id is None
    assert ticket.support_assignee_id == seed["alice"].id  # lock preserved, just not current owner


def test_sales_can_freely_assign_while_holding_the_ticket(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])
    ticket = ticket_service.change_team(db_session, ticket, routing["sales"], seed["creator"], EventSource.DASHBOARD)

    ticket = ticket_service.assign_ticket(db_session, ticket, seed["bob"], seed["creator"], EventSource.DASHBOARD)
    assert ticket.owner_id == seed["bob"].id


def test_returning_to_support_restores_locked_assignee(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])
    ticket = ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["alice"], EventSource.DASHBOARD)
    ticket = ticket_service.change_team(db_session, ticket, routing["sales"], seed["alice"], EventSource.DASHBOARD)
    ticket = ticket_service.assign_ticket(db_session, ticket, seed["bob"], seed["creator"], EventSource.DASHBOARD)

    ticket = ticket_service.change_team(db_session, ticket, routing["support"], seed["bob"], EventSource.DASHBOARD)

    assert ticket.owner_id == seed["alice"].id
    assert ticket.support_assignee_id == seed["alice"].id


def test_timeline_includes_team_change(db_session, seed, routing):
    ticket = _create_ticket(db_session, seed, routing["support"])
    ticket_service.change_team(db_session, ticket, routing["sales"], seed["creator"], EventSource.DASHBOARD)

    timeline = ticket_service.get_timeline(db_session, ticket)
    team_events = [e for e in timeline if e.event_type == "team_changed"]
    assert len(team_events) == 1
    assert "Sales" in team_events[0].description
    assert "Support" in team_events[0].description
