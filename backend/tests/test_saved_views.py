import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


ALICE = {"X-Dev-User-Email": "alice@example.com"}
BOB = {"X-Dev-User-Email": "bob@example.com"}


def test_save_list_and_delete_a_view(client, seed):
    r = client.post(
        "/api/me/views",
        json={"name": "  My urgent  ", "filters": {"owner_id": seed["alice"].id, "priority": "urgent"}},
        headers=ALICE,
    )
    assert r.status_code == 201
    view = r.json()
    assert view["name"] == "My urgent"
    assert view["filters"]["priority"] == "urgent"

    assert [v["name"] for v in client.get("/api/me/views", headers=ALICE).json()] == ["My urgent"]
    assert client.delete(f"/api/me/views/{view['id']}", headers=ALICE).status_code == 204
    assert client.get("/api/me/views", headers=ALICE).json() == []


def test_views_are_private(client, seed):
    view = client.post("/api/me/views", json={"name": "Mine", "filters": {}}, headers=ALICE).json()
    assert client.get("/api/me/views", headers=BOB).json() == []
    # Someone else's view looks like it doesn't exist.
    assert client.delete(f"/api/me/views/{view['id']}", headers=BOB).status_code == 404


def test_duplicate_names_are_rejected_case_insensitively(client, seed):
    assert client.post("/api/me/views", json={"name": "Billing", "filters": {}}, headers=ALICE).status_code == 201
    r = client.post("/api/me/views", json={"name": "billing", "filters": {}}, headers=ALICE)
    assert r.status_code == 409
    assert "already have a view" in r.json()["detail"]
    # Another person may use the same name.
    assert client.post("/api/me/views", json={"name": "Billing", "filters": {}}, headers=BOB).status_code == 201


def test_filters_are_validated(client, seed):
    assert client.post("/api/me/views", json={"name": "x", "filters": {"nope": 1}}, headers=ALICE).status_code == 422
    assert client.post("/api/me/views", json={"name": "x", "filters": {"priority": "meh"}}, headers=ALICE).status_code == 422
    assert client.post("/api/me/views", json={"name": "   ", "filters": {}}, headers=ALICE).status_code == 422


def test_view_limit(client, seed):
    for i in range(20):
        assert client.post("/api/me/views", json={"name": f"v{i}", "filters": {}}, headers=ALICE).status_code == 201
    r = client.post("/api/me/views", json={"name": "one more", "filters": {}}, headers=ALICE)
    assert r.status_code == 409
    assert "up to 20" in r.json()["detail"]
