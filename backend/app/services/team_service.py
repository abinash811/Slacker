from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.role import Role
from app.models.team import Team, TeamMember
from app.models.user import User

_MEMBER_LOAD_OPTIONS = (joinedload(TeamMember.user), joinedload(TeamMember.role))


def list_teams(db: Session) -> list[Team]:
    return list(db.execute(select(Team).order_by(Team.name)).scalars().all())


def get_team_or_404(db: Session, team_id: int) -> Team:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def create_team(db: Session, name: str) -> Team:
    existing = db.execute(select(Team).where(Team.name == name)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="A team with this name already exists")
    team = Team(name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def rename_team(db: Session, team: Team, name: str) -> Team:
    team.name = name
    db.commit()
    db.refresh(team)
    return team


def list_members(db: Session, team_id: int) -> list[TeamMember]:
    stmt = select(TeamMember).options(*_MEMBER_LOAD_OPTIONS).where(TeamMember.team_id == team_id)
    return list(db.execute(stmt).unique().scalars().all())


def add_member(db: Session, team_id: int, user_id: int, role_id: int) -> TeamMember:
    if db.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    if db.get(Role, role_id) is None:
        raise HTTPException(status_code=404, detail="Role not found")
    existing = db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="User is already a member of this team")

    member = TeamMember(team_id=team_id, user_id=user_id, role_id=role_id)
    db.add(member)
    db.commit()
    return get_member_or_404(db, team_id, member.id)


def get_member_or_404(db: Session, team_id: int, member_id: int) -> TeamMember:
    stmt = (
        select(TeamMember)
        .options(*_MEMBER_LOAD_OPTIONS)
        .where(TeamMember.id == member_id, TeamMember.team_id == team_id)
    )
    member = db.execute(stmt).unique().scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Team member not found")
    return member


def update_member_role(db: Session, team_id: int, member_id: int, role_id: int) -> TeamMember:
    if db.get(Role, role_id) is None:
        raise HTTPException(status_code=404, detail="Role not found")
    member = get_member_or_404(db, team_id, member_id)
    member.role_id = role_id
    db.commit()
    db.refresh(member)
    return get_member_or_404(db, team_id, member_id)


def remove_member(db: Session, team_id: int, member_id: int) -> None:
    member = get_member_or_404(db, team_id, member_id)
    db.delete(member)
    db.commit()
