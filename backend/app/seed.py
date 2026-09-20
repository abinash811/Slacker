"""Seed data for local development: a couple of teams, categories, SLA
policies, and users so the dashboard/Slack flows have something to work
against immediately after `docker compose up`.

Run with: python -m app.seed
"""

from app.core.database import SessionLocal
from app.models.category import Category
from app.models.sla import SLAPolicy
from app.models.team import Team
from app.models.user import User


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Team).count() > 0:
            print("Seed data already present, skipping.")
            return

        teams = {name: Team(name=name) for name in ["Product", "Sales", "Support"]}
        db.add_all(teams.values())

        categories = {name: Category(name=name) for name in ["Product", "Billing", "Technical", "General"]}
        db.add_all(categories.values())

        db.flush()

        db.add_all(
            [
                SLAPolicy(name="24 hours", duration_hours=24, is_default=False),
                SLAPolicy(name="48 hours", duration_hours=48, is_default=True),
                SLAPolicy(name="72 hours", duration_hours=72, is_default=False),
            ]
        )

        db.add_all(
            [
                User(email="admin@example.com", name="Admin User"),
                User(email="abinash@example.com", name="Abinash"),
                User(email="rahul@example.com", name="Rahul"),
                User(email="priya@example.com", name="Priya"),
            ]
        )

        db.commit()
        print("Seed data created.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
