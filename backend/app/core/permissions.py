"""Settings-panel authorization (Role.can_create/edit/delete_settings).

A user holds a permission if any of their team memberships has a
non-archived role granting it. Tickets and dashboards stay open to everyone
(V1 "everyone sees everything"); only Settings writes are gated.

Actions:
    create — add a role, team, member, category, tag, or custom field
    edit   — rename, change a member's role, set the default team, change SLA
    delete — archive/restore anything, remove a member

Two safety rules:
  * Bootstrap: if *nobody* holds a permission (fresh install, or every
    holder removed), it is open to everyone, so Settings can never be
    permanently locked.
  * No escalation: a role may only be created, edited, or assigned by
    someone who already holds every permission that role grants.
"""

from typing import Literal

from fastapi import Depends, HTTPException
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.role import Role
from app.models.team import TeamMember
from app.models.user import User

SettingsAction = Literal["create", "edit", "delete"]

_FLAG = {
    "create": Role.can_create_settings,
    "edit": Role.can_edit_settings,
    "delete": Role.can_delete_settings,
}

_VERB = {"create": "add", "edit": "change", "delete": "archive or remove"}


def _holders(action: SettingsAction):
    return (
        select(TeamMember.user_id)
        .join(Role, Role.id == TeamMember.role_id)
        .where(_FLAG[action].is_(True), Role.is_archived.is_(False))
    )


def has_permission(db: Session, user: User, action: SettingsAction) -> bool:
    holds = db.scalar(select(exists(_holders(action).where(TeamMember.user_id == user.id))))
    if holds:
        return True
    # Bootstrap: nobody holds it, so it's open rather than locked forever.
    return not db.scalar(select(exists(_holders(action))))


def permissions_for(db: Session, user: User) -> dict[SettingsAction, bool]:
    return {action: has_permission(db, user, action) for action in ("create", "edit", "delete")}


def ensure_permission(db: Session, user: User, action: SettingsAction) -> None:
    if not has_permission(db, user, action):
        raise HTTPException(
            status_code=403,
            detail=f"Your role doesn't allow you to {_VERB[action]} items in Settings. Ask a Settings admin.",
        )


def ensure_can_grant(db: Session, user: User, *, create: bool, edit: bool, delete: bool) -> None:
    """Block granting permissions the acting user doesn't hold themselves."""
    wanted = {"create": create, "edit": edit, "delete": delete}
    missing = [a for a, on in wanted.items() if on and not has_permission(db, user, a)]  # type: ignore[arg-type]
    if missing:
        raise HTTPException(
            status_code=403,
            detail=f"You can't grant permissions you don't have yourself ({', '.join(missing)}).",
        )


def require(action: SettingsAction):
    """FastAPI dependency: `user: User = Depends(require("create"))`."""

    def dependency(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> User:
        ensure_permission(db, user, action)
        return user

    return dependency


def ensure_update(db: Session, user: User, changes: dict) -> None:
    """A PATCH that archives/restores needs `delete`; any other field needs `edit`."""
    if "is_archived" in changes:
        ensure_permission(db, user, "delete")
    if set(changes) - {"is_archived"}:
        ensure_permission(db, user, "edit")


def ensure_can_assign_role(db: Session, user: User, role: Role) -> None:
    ensure_can_grant(
        db, user, create=role.can_create_settings, edit=role.can_edit_settings, delete=role.can_delete_settings
    )
