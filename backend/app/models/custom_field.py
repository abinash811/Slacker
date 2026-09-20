import enum

from sqlalchemy import Boolean, Enum, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class CustomFieldType(str, enum.Enum):
    TEXT = "text"
    DROPDOWN = "dropdown"


class CustomFieldDefinition(Base, TimestampMixin):
    """An admin-defined extra ticket field (e.g. "Business ID", "Doctor
    ID") — created via the dashboard's Form Fields & Dropdowns screen, not
    hardcoded. Rendered as an extra input on both the dashboard's and
    Slack's ticket-creation forms, and shown on the ticket detail page.
    """

    __tablename__ = "custom_field_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[CustomFieldType] = mapped_column(Enum(CustomFieldType, name="custom_field_type"), nullable=False)
    # Only populated (and meaningful) when field_type == DROPDOWN.
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TicketCustomFieldValue(Base, TimestampMixin):
    __tablename__ = "ticket_custom_field_values"
    __table_args__ = (UniqueConstraint("ticket_id", "field_definition_id", name="uq_ticket_custom_field"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), index=True, nullable=False)
    field_definition_id: Mapped[int] = mapped_column(ForeignKey("custom_field_definitions.id"), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)

    field_definition: Mapped[CustomFieldDefinition] = relationship(CustomFieldDefinition)
