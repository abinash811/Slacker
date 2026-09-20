"""Maps a Slack user id to our internal `User` row.

Slack gives us a stable `user_id` on every interaction but that is not our
primary key — ownership/accountability is tracked against `users.id`. This
is the one place that link gets made or backfilled, so every Slack-sourced
action ends up attributed to the same internal user record dashboard
actions use.
"""

import logging

from slack_sdk import WebClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User

logger = logging.getLogger(__name__)


def resolve_or_create_user(db: Session, client: WebClient, slack_user_id: str) -> User:
    user = db.execute(select(User).where(User.slack_user_id == slack_user_id)).scalar_one_or_none()
    if user is not None:
        return user

    try:
        info = client.users_info(user=slack_user_id)["user"]
        email = info.get("profile", {}).get("email") or f"{slack_user_id}@slack.local"
        name = info.get("real_name") or info.get("name") or slack_user_id
        avatar_url = info.get("profile", {}).get("image_192")
    except Exception:
        logger.exception("users.info lookup failed for %s; using placeholder identity", slack_user_id)
        email = f"{slack_user_id}@slack.local"
        name = slack_user_id
        avatar_url = None

    # A user created via the dashboard with a matching email just needs the
    # Slack id backfilled, rather than creating a duplicate person.
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is not None:
        user.slack_user_id = slack_user_id
        db.commit()
        return user

    user = User(email=email, name=name, slack_user_id=slack_user_id, avatar_url=avatar_url)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
