from datetime import datetime, timedelta, timezone

from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.services import analytics_service, ticket_service
from app.services.filters import TicketFilters


def _create_ticket(db, seed, **overrides):
    kwargs = dict(
        title="Issue",
        description="Something broke",
        customer="Acme",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.MEDIUM,
        sla_policy_id=seed["sla_48h"].id,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    kwargs.update(overrides)
    return ticket_service.create_ticket(db, **kwargs)


def test_summary_counts_open_pending_and_breached(db_session, seed):
    open_ticket = _create_ticket(db_session, seed)
    pending_ticket = _create_ticket(db_session, seed)
    ticket_service.change_status(db_session, pending_ticket, TicketStatus.PENDING, seed["creator"], EventSource.DASHBOARD)

    breached_ticket = _create_ticket(db_session, seed, sla_policy_id=seed["sla_24h"].id)
    breached_ticket.sla_due_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.commit()

    resolved_ticket = _create_ticket(db_session, seed)
    ticket_service.resolve_ticket(db_session, resolved_ticket, seed["creator"], EventSource.DASHBOARD)

    summary = analytics_service.dashboard_summary(db_session, TicketFilters())

    assert summary.total_open_tickets == 3  # open, pending, breached (not resolved)
    assert summary.total_resolved_tickets == 1
    assert summary.tickets_pending == 1
    assert summary.sla_breached_tickets == 1
    assert summary.sla_compliance_pct == 100.0  # the one resolved ticket met its SLA

    assert open_ticket.id != pending_ticket.id  # sanity: distinct tickets were created


def test_filters_scope_summary_to_one_team(db_session, seed):
    from app.models.team import Team

    other_team = Team(name="Sales")
    db_session.add(other_team)
    db_session.commit()

    _create_ticket(db_session, seed, team_id=seed["team"].id)
    _create_ticket(db_session, seed, team_id=other_team.id)

    summary = analytics_service.dashboard_summary(db_session, TicketFilters(team_id=seed["team"].id))
    assert summary.total_open_tickets == 1


def test_owner_pending_groups_by_current_owner(db_session, seed):
    t1 = _create_ticket(db_session, seed, owner_id=seed["alice"].id)
    t2 = _create_ticket(db_session, seed, owner_id=seed["alice"].id)
    _create_ticket(db_session, seed, owner_id=seed["bob"].id)

    result = analytics_service.owner_pending(db_session, TicketFilters())
    by_name = {item.owner_name: item.pending_count for item in result}

    assert by_name["Alice"] == 2
    assert by_name["Bob"] == 1
    assert t1.owner_id == t2.owner_id
