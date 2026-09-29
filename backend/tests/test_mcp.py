"""The MCP server at /mcp: personal keys, and the read-only tools answering
over real HTTP the way Claude calls them."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import EventSource, TicketPriority, TicketStatus
from app.services import api_token_service, ticket_service

ALICE = {"X-Dev-User-Email": "alice@example.com"}
PROTOCOL = "2025-06-18"


class McpClient:
    def __init__(self, http: TestClient, key: str | None):
        self.http = http
        self.headers = {"Accept": "application/json, text/event-stream"}
        if key:
            self.headers["Authorization"] = f"Bearer {key}"
        self._id = 0

    def rpc(self, method: str, params: dict | None = None):
        self._id += 1
        return self.http.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": self._id, "method": method, "params": params or {}},
            headers={**self.headers, "MCP-Protocol-Version": PROTOCOL},
        )

    def initialize(self):
        response = self.rpc(
            "initialize", {"protocolVersion": PROTOCOL, "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}}
        )
        assert response.status_code == 200, response.text
        return self

    def call(self, tool: str, **arguments):
        response = self.rpc("tools/call", {"name": tool, "arguments": arguments})
        assert response.status_code == 200, response.text
        return response.json()["result"]


@pytest.fixture
def http():
    with TestClient(app, base_url="http://localhost:8000") as client:
        yield client


@pytest.fixture
def mcp(http, db_session, seed):
    _, key = api_token_service.create_token(db_session, seed["alice"], "Claude")
    return McpClient(http, key).initialize()


def _ticket(db, seed, title, **overrides):
    kwargs = dict(
        title=title, description="d", customer="Sunrise Clinic", category_id=seed["category"].id,
        team_id=seed["team"].id, priority=TicketPriority.MEDIUM, owner_id=None, created_by=seed["creator"],
        source=EventSource.DASHBOARD,
    )
    kwargs.update(overrides)
    return ticket_service.create_ticket(db, **kwargs)


def test_keys_are_created_once_listed_and_revoked(http, seed):
    created = http.post("/api/me/tokens", json={"name": "Claude Desktop"}, headers=ALICE)
    assert created.status_code == 201
    key = created.json()["key"]
    assert key.startswith("slk_") and created.json()["prefix"] == key[:12]

    listed = http.get("/api/me/tokens", headers=ALICE).json()
    assert [t["name"] for t in listed] == ["Claude Desktop"]
    assert "key" not in listed[0]  # the full key is never shown again

    client = McpClient(http, key).initialize()
    assert client.call("whoami")["structuredContent"] == {"name": "Alice", "email": "alice@example.com"}

    assert http.delete(f"/api/me/tokens/{created.json()['id']}", headers=ALICE).status_code == 204
    assert client.rpc("tools/list").status_code == 401


def test_other_peoples_keys_cannot_be_revoked(http, seed):
    created = http.post("/api/me/tokens", json={"name": "mine"}, headers=ALICE).json()
    response = http.delete(f"/api/me/tokens/{created['id']}", headers={"X-Dev-User-Email": "bob@example.com"})
    assert response.status_code == 404


def test_calls_without_a_valid_key_are_rejected(http, seed):
    assert McpClient(http, None).rpc("tools/list").status_code == 401
    assert McpClient(http, "slk_not-a-real-key").rpc("tools/list").status_code == 401


def test_tools_are_read_only(mcp):
    tools = mcp.rpc("tools/list").json()["result"]["tools"]
    assert {t["name"] for t in tools} == {
        "whoami", "list_reference_data", "search_tickets", "get_ticket", "get_summary", "get_breakdown", "get_weekly_trends",
    }
    assert all(t["annotations"]["readOnlyHint"] is True for t in tools)


def test_search_filters_by_names_and_me(mcp, db_session, seed):
    mine = _ticket(db_session, seed, "Login broken", owner_id=seed["alice"].id, priority=TicketPriority.URGENT)
    _ticket(db_session, seed, "Printer jam", owner_id=seed["bob"].id)
    done = _ticket(db_session, seed, "Old login issue", owner_id=seed["alice"].id)
    ticket_service.change_status(db_session, done, TicketStatus.RESOLVED, seed["creator"], EventSource.DASHBOARD)

    result = mcp.call("search_tickets", pending_on="me", state="ongoing", team="product")["structuredContent"]
    assert result["total"] == 1
    hit = result["tickets"][0]
    assert hit["ticket_number"] == mine.ticket_number
    assert hit["url"].endswith(f"/tickets/{mine.id}")

    assert mcp.call("search_tickets", text="login")["structuredContent"]["total"] == 2
    assert mcp.call("search_tickets", pending_on="Bob")["structuredContent"]["total"] == 1


def test_unknown_names_explain_what_exists(mcp, seed):
    result = mcp.call("search_tickets", team="Billing")
    assert result["isError"] is True
    assert "No team named 'Billing'. Teams: Product." in result["content"][0]["text"]


def test_get_ticket_includes_timeline(mcp, db_session, seed):
    ticket = _ticket(db_session, seed, "Login broken")
    ticket_service.assign_ticket(db_session, ticket, seed["alice"], seed["creator"], EventSource.DASHBOARD)

    detail = mcp.call("get_ticket", ticket_number=ticket.ticket_number)["structuredContent"]
    assert detail["ticket"]["title"] == "Login broken"
    assert [e["description"] for e in detail["timeline"]] == ["Ticket created", "Assigned to Alice"]

    missing = mcp.call("get_ticket", ticket_number=999999)
    assert missing["isError"] is True and "no ticket #999999" in missing["content"][0]["text"]


def test_analysis_tools_match_the_dashboard(mcp, http, db_session, seed):
    _ticket(db_session, seed, "One", owner_id=seed["alice"].id)
    resolved = _ticket(db_session, seed, "Two")
    ticket_service.resolve_ticket(db_session, resolved, seed["creator"], EventSource.DASHBOARD)

    summary = mcp.call("get_summary")["structuredContent"]
    dashboard = http.get("/api/analytics/summary", headers=ALICE).json()
    assert summary == dashboard

    by_team = mcp.call("get_breakdown", by="team")["structuredContent"]
    assert by_team["rows"][0]["label"] == "Product" and by_team["rows"][0]["total"] == 2
    by_person = mcp.call("get_breakdown", by="pending_on")["structuredContent"]
    assert {"owner_name": "Alice", "pending_count": 1} .items() <= by_person["rows"][0].items()

    trends = mcp.call("get_weekly_trends", weeks=4)["structuredContent"]
    assert len(trends["result"]) == 4
    assert sum(w["created"] for w in trends["result"]) == 2


def test_mcp_info_gives_the_connection_url(http):
    assert http.get("/api/mcp-info", headers=ALICE).json() == {"url": "http://localhost:8000/mcp"}
