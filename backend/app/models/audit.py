from sqlalchemy import Enum, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import EventSource
from app.models.mixins import TimestampMixin


class AuditEvent(Base, TimestampMixin):
    """Catch-all audit trail for events not already covered by a typed
    history table (e.g. ticket created, Slack action received, dashboard
    edit). The typed history tables remain the primary source for
    accountability metrics; this table is for a complete raw audit log.
    """

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id"), index=True, nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    source: Mapped[EventSource] = mapped_column(Enum(EventSource, name="event_source"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
