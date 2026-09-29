"""Sub-issues: a ticket linked to a main ticket, one level deep, posted as
its own Slack message and announced in the main ticket's thread."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.services import slack_service, ticket_service

CREATOR = {"X-Dev-User-Email": "creator@example.com"}


def _payload(seed, **extra):
    return {
        "title": "Check the login server",
        "description": "Part of the login issue",
        "customer": "ABT pvt ltd",
        "category_id": seed["category"].id,
        "team_id": seed["team"].id,
        "push_to_slack": False,
        **extra,
    }


def _main_ticket(db, seed):
    return ticket_service.create_ticket(
        db, title="Login not working", description="d", customer="ABT pvt ltd", category_id=seed["category"].id,
        team_id=seed["team"].id, priority=TicketPriority.HIGH, owner_id=None, created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )


def test_sub_issue_links_both_ways_and_shows_on_timelines(db_session, seed):
    main = _main_ticket(db_session, seed)
    client = TestClient(app)

    response = client.post("/api/tickets", json=_payload(seed, parent_id=main.id), headers=CREATOR)
    assert response.status_code == 201, response.text
    sub = response.json()
    assert sub["parent"]["ticket_number"] == main.ticket_number

    main_out = client.get(f"/api/tickets/{main.id}", headers=CREATOR).json()
    assert [s["ticket_number"] for s in main_out["sub_issues"]] == [sub["ticket_number"]]
    assert main_out["sub_issues"][0]["status"] == "open"

    main_timeline = client.get(f"/api/tickets/{main.id}/timeline", headers=CREATOR).json()
    assert f"Sub-issue #{sub['ticket_number']} created: Check the login server" in [e["description"] for e in main_timeline]
    sub_timeline = client.get(f"/api/tickets/{sub['id']}/timeline", headers=CREATOR).json()
    assert sub_timeline[0]["description"] == f"Created as a sub-issue of #{main.ticket_number}"

    listed = client.get("/api/tickets", headers=CREATOR).json()["items"]
    by_id = {t["id"]: t for t in listed}
    assert by_id[sub["id"]]["parent_ticket_number"] == main.ticket_number
    assert by_id[main.id]["parent_ticket_number"] is None


def test_sub_issues_are_one_level_deep(db_session, seed):
    main = _main_ticket(db_session, seed)
    client = TestClient(app)
    sub = client.post("/api/tickets", json=_payload(seed, parent_id=main.id), headers=CREATOR).json()

    response = client.post("/api/tickets", json=_payload(seed, parent_id=sub["id"]), headers=CREATOR)
    assert response.status_code == 400
    assert "can't have its own sub-issues" in response.json()["detail"]


def test_unknown_parent_is_rejected(db_session, seed):
    response = TestClient(app).post("/api/tickets", json=_payload(seed, parent_id=99999), headers=CREATOR)
    assert response.status_code == 404


class FakeClient:
    def __init__(self):
        self.posts, self.updates = [], []

    def chat_postMessage(self, **kwargs):
        self.posts.append(kwargs)
        return {"ts": f"1700000000.{len(self.posts):06d}"}

    def chat_update(self, **kwargs):
        self.updates.append(kwargs)
        return {"ok": True}

    def chat_getPermalink(self, channel, message_ts):
        return {"permalink": f"https://example.slack.com/archives/{channel}/p{message_ts.replace('.', '')}"}

    def users_lookupByEmail(self, email):
        from slack_sdk.errors import SlackApiError

        raise SlackApiError("users_not_found", {"error": "users_not_found"})


@pytest.fixture
def slack(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(slack_service, "get_client", lambda: client)
    monkeypatch.setattr(get_settings(), "slack_bot_token", "xoxb-test")
    return client


def test_sub_issue_gets_its_own_message_and_a_note_in_the_main_thread(db_session, seed, slack):
    main = _main_ticket(db_session, seed)
    main.slack_channel_id = "CSUPPORT"
    main = slack_service.post_ticket_message(db_session, main)

    sub = ticket_service.create_ticket(
        db_session, title="Check the login server", description="d", customer="ABT pvt ltd",
        category_id=seed["category"].id, team_id=seed["team"].id, priority=TicketPriority.MEDIUM, owner_id=None,
        created_by=seed["creator"], source=EventSource.DASHBOARD, parent_id=main.id,
    )
    sub.slack_channel_id = "CSUPPORT"
    sub = slack_service.post_ticket_message(db_session, sub)

    own_message, thread_note = slack.posts[1], slack.posts[2]
    assert "thread_ts" not in own_message  # a new message with its own thread
    assert f"Sub-issue of #{main.ticket_number}" in str(own_message["blocks"])
    assert thread_note["thread_ts"] == main.slack_message_ts
    assert thread_note["text"].startswith("Sub-issue created: <https://example.slack.com/")
    # The main ticket's message now shows progress.
    assert "Sub-issues: 0 of 1 done" in str(slack.updates[-1]["blocks"])

    ticket_service.change_status(db_session, sub, TicketStatus.RESOLVED, seed["creator"], EventSource.DASHBOARD)
    sub = ticket_service.get_ticket_or_404(db_session, sub.id)
    slack_service.notify_ticket_change(db_session, sub, seed["creator"], "status")
    assert "Sub-issues: 1 of 1 done" in str(slack.updates[-1]["blocks"])


def test_sub_issue_modal_prefills_from_the_main_ticket(db_session, seed):
    main = _main_ticket(db_session, seed)
    view = slack_service.build_create_ticket_modal(db_session, parent=main)

    assert view["private_metadata"] == str(main.id)
    assert view["title"]["text"] == f"Sub-issue of #{main.ticket_number}"
    customer = next(b for b in view["blocks"] if b.get("block_id") == "customer")
    assert customer["element"]["initial_value"] == "ABT pvt ltd"
