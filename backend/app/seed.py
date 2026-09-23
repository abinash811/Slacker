"""Seed data for local development: a couple of teams, categories, the
default SLA setting, and users so the dashboard/Slack flows have something
to work against immediately after `docker compose up`.

Run with: python -m app.seed
"""

from app.core.database import SessionLocal
from app.models.category import Category
from app.models.role import Role
from app.models.sla import SLASettings
from app.models.tag import Tag
from app.models.team import Team
from app.models.user import User


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Team).count() > 0:
            print("Seed data already present, skipping.")
            return

        teams = {name: Team(name=name, is_default=name == "Support") for name in ["Product", "Sales", "Support"]}
        db.add_all(teams.values())

        categories = {name: Category(name=name) for name in ["Product", "Billing", "Technical", "General"]}
        db.add_all(categories.values())

        db.add_all(Tag(name=name) for name in ["Appointment", "Prescription", "Payments", "Login"])

        db.flush()

        db.add(SLASettings(id=1, default_hours=48))

        db.add_all(
            [
                User(email="admin@example.com", name="Admin User"),
                User(email="abinash@example.com", name="Abinash"),
                User(email="rahul@example.com", name="Rahul"),
                User(email="priya@example.com", name="Priya"),
            ]
        )

        db.add_all(
            [
                Role(name="Member"),
                Role(name="Lead", can_create_settings=True),
                Role(name="Manager", can_create_settings=True, can_edit_settings=True, can_delete_settings=True),
            ]
        )

        db.commit()
        print("Seed data created.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
