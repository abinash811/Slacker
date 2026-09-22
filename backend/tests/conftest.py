"""Test DB setup: runs the real Alembic migrations against a dedicated
`slacker_test` database, so tests exercise the exact schema production
uses (including the raw `CREATE SEQUENCE` for ticket numbers) rather than
a SQLAlchemy `create_all()` approximation.
"""

import os
from pathlib import Path

TEST_DATABASE_URL = "postgresql+psycopg://slacker:slacker@localhost:5432/slacker_test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session", autouse=True)
def _test_database():
    admin_engine = create_engine(
        "postgresql+psycopg://slacker:slacker@localhost:5432/postgres", isolation_level="AUTOCOMMIT"
    )
    with admin_engine.connect() as conn:
        conn.execute(text("DROP DATABASE IF EXISTS slacker_test"))
        conn.execute(text("CREATE DATABASE slacker_test"))
    admin_engine.dispose()

    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(cfg, "head")
    yield


@pytest.fixture
def db_session():
    from app.core.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(autouse=True)
def _clean_tables(db_session):
    """Truncate everything between tests so each test starts from a blank
    slate without paying for a fresh migration run per test.
    """
    from sqlalchemy import text as sa_text

    tables = [
        "audit_events",
        "ticket_tags",
        "tags",
        "ticket_custom_field_values",
        "custom_field_definitions",
        "ticket_comments",
        "ticket_priority_history",
        "ticket_status_history",
        "ticket_team_history",
        "ticket_assignments",
        "tickets",
        "slack_event_dedup",
        "slack_channels",
        "sla_policies",
        "team_members",
        "roles",
        "users",
        "categories",
        "teams",
    ]
    db_session.execute(sa_text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
    db_session.commit()
    yield


@pytest.fixture
def seed(db_session):
    from app.models.category import Category
    from app.models.sla import SLAPolicy
    from app.models.team import Team
    from app.models.user import User

    team = Team(name="Product")
    category = Category(name="Product")
    sla_48h = SLAPolicy(name="48 hours", duration_hours=48, is_default=True)
    sla_24h = SLAPolicy(name="24 hours", duration_hours=24)
    creator = User(email="creator@example.com", name="Creator")
    alice = User(email="alice@example.com", name="Alice")
    bob = User(email="bob@example.com", name="Bob")

    db_session.add_all([team, category, sla_48h, sla_24h, creator, alice, bob])
    db_session.commit()

    return {
        "team": team,
        "category": category,
        "sla_48h": sla_48h,
        "sla_24h": sla_24h,
        "creator": creator,
        "alice": alice,
        "bob": bob,
    }
