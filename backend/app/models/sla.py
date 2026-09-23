from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class SLASettings(Base, TimestampMixin):
    """A single global row: the SLA duration applied to every new ticket.

    Not per-team/category/priority, and not per-ticket-creator choice —
    the admin sets one value here and it governs all tickets going
    forward. Existing tickets keep whatever value was in effect when they
    were created (see Ticket.sla_hours), so changing this never rewrites
    history.
    """

    __tablename__ = "sla_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    default_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=48)
