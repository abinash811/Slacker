"""Assignment and status changes must reach people through Slack
notifications: the ticket message is edited (silent), so each change also
posts a thread reply that @mentions the owner. Dashboard-only users get
linked to their Slack account by email so the mention works.
"""

import pytest
from slack_sdk.errors import SlackApiError

from app.core.config import get_settings
from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.services import slack_service, ticket_service

SLACK_IDS = {"alice@example.com": "UALICE"}


class FakeResponse(dict):
    status_code = 200
    headers: dict = {}


class FakeClient:
    def __init__(self):
        self.posts: list[dict] = []
        self.updates: list[dict] = []

    def users_lookupByEmail(self, email):
        if email not in SLACK_IDS:
            raise SlackApiError("users_not_found", FakeResponse(error="users_not_found"))
        return {"user": {"id": SLACK_IDS[email]}}

    def chat_postMessage(self, **kwargs):
        self.posts.append(kwargs)
        return {"ts": "1700000000.000100"}

    def chat_update(self, **kwargs):
        self.updates.append(kwargs)
        return {"ok": True}


@pytest.fixture
def slack(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(slack_service, "get_client", lambda: client)
    monkeypatch.setattr(get_settings(), "slack_bot_token", "xoxb-test")
    return client


def _posted_ticket(db, seed, **overrides):
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
    ticket = ticket_service.create_ticket(db, **kwargs)
    ticket.slack_channel_id = "CSUPPORT"
    return slack_service.post_ticket_message(db, ticket)


def test_link_slack_user_finds_account_by_email(db_session, seed, slack):
    assert slack_service.link_slack_user(db_session, seed["alice"]) == "UALICE"
    db_session.refresh(seed["alice"])
    assert seed["alice"].slack_user_id == "UALICE"


def test_link_slack_user_without_account_returns_none(db_session, seed, slack):
    assert slack_service.link_slack_user(db_session, seed["bob"]) is None
    assert seed["bob"].slack_user_id is None


def test_new_ticket_mentions_owner_linked_by_email(db_session, seed, slack):
    _posted_ticket(db_session, seed, owner_id=seed["alice"].id)

    assert "<@UALICE>" in str(slack.posts[0]["blocks"])


def test_assignment_posts_thread_reply_mentioning_new_owner(db_session, seed, slack):
    ticket = _posted_ticket(db_session, seed)
    ticket = ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["creator"], EventSource.DASHBOARD)
    slack_service.notify_ticket_change(db_session, ticket, seed["creator"], "assigned")

    reply = slack.posts[-1]
    assert reply["thread_ts"] == ticket.slack_message_ts
    assert reply["text"] == "<@UALICE>, you've been assigned this ticket by Creator."
    assert len(slack.updates) == 1


def test_owner_without_slack_account_is_named(db_session, seed, slack):
    ticket = _posted_ticket(db_session, seed, owner_id=seed["bob"].id)

    assert slack_service.assignment_note(ticket, seed["creator"]) == "Bob, you've been assigned this ticket by Creator."


def test_status_change_ccs_owner(db_session, seed, slack):
    ticket = _posted_ticket(db_session, seed, owner_id=seed["alice"].id)
    ticket = ticket_service.change_status(db_session, ticket, TicketStatus.IN_PROGRESS, seed["creator"], EventSource.DASHBOARD)

    assert slack_service.status_note(ticket, seed["creator"]) == "Status changed to *In Progress* by Creator. cc <@UALICE>"


def test_owner_changing_own_ticket_is_not_ccd(db_session, seed, slack):
    ticket = _posted_ticket(db_session, seed, owner_id=seed["alice"].id)
    ticket = ticket_service.resolve_ticket(db_session, ticket, seed["alice"], EventSource.DASHBOARD)

    assert slack_service.status_note(ticket, seed["alice"]) == "Status changed to *Resolved* by Alice."


def test_ticket_not_in_slack_posts_nothing(db_session, seed, slack):
    ticket = ticket_service.create_ticket(
        db_session,
        title="t",
        description="d",
        customer="c",
        category_id=seed["category"].id,
        team_id=seed["team"].id,
        priority=TicketPriority.LOW,
        owner_id=None,
        created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    slack_service.notify_ticket_change(db_session, ticket, seed["creator"], "assigned")

    assert slack.posts == [] and slack.updates == []


def test_assign_endpoint_notifies_thread(db_session, seed, slack):
    from fastapi.testclient import TestClient

    from app.main import app

    ticket = _posted_ticket(db_session, seed)
    api = TestClient(app)
    response = api.post(
        f"/api/tickets/{ticket.id}/assign",
        json={"owner_id": seed["alice"].id},
        headers={"X-Dev-User-Email": "creator@example.com"},
    )
    assert response.status_code == 200, response.text
    assert slack.posts[-1]["text"].startswith("<@UALICE>")

    # Re-assigning to the same person changes nothing and posts nothing.
    count = len(slack.posts)
    api.post(
        f"/api/tickets/{ticket.id}/assign",
        json={"owner_id": seed["alice"].id},
        headers={"X-Dev-User-Email": "creator@example.com"},
    )
    assert len(slack.posts) == count
