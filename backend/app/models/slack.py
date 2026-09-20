from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, utcnow


class SlackChannel(Base, TimestampMixin):
    """Maps a team to the Slack channel its tickets get posted to.

    `team_id IS NULL, is_default=True` is the shared fallback channel used
    when a team has no dedicated mapping (product decision: mostly one
    shared channel, with specific teams overridden).
    """

    __tablename__ = "slack_channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    slack_channel_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), unique=True, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SlackEventDedup(Base):
    """Records processed Slack event/action ids so at-least-once delivery
    (Slack's Events API retries on slow/failed acks) never double-applies
    a ticket mutation.
    """

    __tablename__ = "slack_event_dedup"

    id: Mapped[int] = mapped_column(primary_key=True)
    slack_event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
