from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Sequence, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.category import Category
from app.models.custom_field import TicketCustomFieldValue
from app.models.enums import TicketPriority, TicketStatus
from app.models.mixins import TimestampMixin, utcnow
from app.models.sla import SLAPolicy
from app.models.tag import Tag
from app.models.team import Team
from app.models.user import User

# Human-facing ticket numbers (e.g. "#1024") start at 1000 so early tickets
# don't look like a fresh/empty system, matching the spec's examples.
ticket_number_seq = Sequence("ticket_number_seq", start=1000)

# Plain association table — tags carry no per-ticket metadata of their own,
# so there's no need for a mapped model here (unlike custom fields, whose
# join row also stores a value).
ticket_tags = Table(
    "ticket_tags",
    Base.metadata,
    Column("ticket_id", ForeignKey("tickets.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)


class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_number: Mapped[int] = mapped_column(
        Integer,
        ticket_number_seq,
        server_default=ticket_number_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    customer: Mapped[str] = mapped_column(String(255), nullable=False)

    # Fixed (not admin-defined) searchable fields — see filters.py search.
    business_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)

    priority: Mapped[TicketPriority] = mapped_column(
        Enum(TicketPriority, name="ticket_priority"), default=TicketPriority.MEDIUM, nullable=False
    )
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"), default=TicketStatus.OPEN, nullable=False
    )

    sla_policy_id: Mapped[int] = mapped_column(ForeignKey("sla_policies.id"), nullable=False)
    sla_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Slack references only — never message content (see docs/DATABASE.md).
    slack_channel_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    slack_message_ts: Mapped[str | None] = mapped_column(String(32), nullable=True)

    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    category: Mapped[Category] = relationship(Category)
    team: Mapped[Team] = relationship(Team)
    sla_policy: Mapped[SLAPolicy] = relationship(SLAPolicy)
    owner: Mapped[User | None] = relationship(User, foreign_keys=[owner_id])
    created_by: Mapped[User] = relationship(User, foreign_keys=[created_by_id])
    custom_field_values: Mapped[list[TicketCustomFieldValue]] = relationship(
        TicketCustomFieldValue, cascade="all, delete-orphan"
    )
    tags: Mapped[list[Tag]] = relationship(Tag, secondary=ticket_tags, order_by=Tag.name)


class TicketAssignment(Base, TimestampMixin):
    """One row per assign/reassign. `created_at` is the moment the new
    owner took the ticket — the basis for "time with each owner" metrics.
    """

    __tablename__ = "ticket_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True, nullable=False)
    previous_owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    new_owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)


class TicketStatusHistory(Base, TimestampMixin):
    __tablename__ = "ticket_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True, nullable=False)
    previous_status: Mapped[TicketStatus | None] = mapped_column(Enum(TicketStatus, name="ticket_status"), nullable=True)
    new_status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus, name="ticket_status"), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)


class TicketPriorityHistory(Base, TimestampMixin):
    __tablename__ = "ticket_priority_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True, nullable=False)
    previous_priority: Mapped[TicketPriority | None] = mapped_column(
        Enum(TicketPriority, name="ticket_priority"), nullable=True
    )
    new_priority: Mapped[TicketPriority] = mapped_column(Enum(TicketPriority, name="ticket_priority"), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)


class TicketComment(Base, TimestampMixin):
    """A reference to a Slack thread reply, NOT a copy of its content.

    Slack remains the source of truth for the actual comment text/files;
    this row exists only so we can count activity and detect first-response
    timing without duplicating message bodies (spec section 6/16).
    """

    __tablename__ = "ticket_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True, nullable=False)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    slack_ts: Mapped[str] = mapped_column(String(32), nullable=False)
