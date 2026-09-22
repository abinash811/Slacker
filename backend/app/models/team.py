from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin
from app.models.role import Role
from app.models.user import User


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # The team new tickets route to by default, and the only team whose
    # membership is allowed to reassign a ticket's locked support_assignee
    # (see Ticket.support_assignee_id). At most one team has this set.
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TeamMember(Base, TimestampMixin):
    """Team membership. Role is not yet used for authorization decisions
    (everyone can see everything, per spec) — see app.models.role.Role for
    where that will hook in later.
    """

    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)

    user: Mapped[User] = relationship(User)
    role: Mapped[Role] = relationship(Role)
