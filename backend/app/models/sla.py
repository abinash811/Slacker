from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import TicketPriority
from app.models.mixins import TimestampMixin


class SLAPolicy(Base, TimestampMixin):
    """A named SLA duration, optionally scoped to a team/category/priority.

    V1 lets the ticket creator pick a policy directly from a dropdown
    (spec section 7). The optional scoping columns exist so a later
    version can auto-select the right policy instead of asking the user,
    without changing the ticket model.
    """

    __tablename__ = "sla_policies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False)

    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    priority: Mapped[TicketPriority | None] = mapped_column(
        Enum(TicketPriority, name="sla_priority"), nullable=True
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
