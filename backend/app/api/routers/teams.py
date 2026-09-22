from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.team import (
    AddTeamMemberRequest,
    TeamCreateRequest,
    TeamDetailOut,
    TeamMemberOut,
    TeamUpdateRequest,
    UpdateTeamMemberRoleRequest,
)
from app.services import team_service

router = APIRouter(prefix="/teams", tags=["teams"])


def _to_detail(db: Session, team) -> TeamDetailOut:
    members = team_service.list_members(db, team.id)
    return TeamDetailOut(
        id=team.id,
        name=team.name,
        is_default=team.is_default,
        members=[TeamMemberOut.model_validate(m) for m in members],
    )


@router.get("/{team_id}/detail", response_model=TeamDetailOut)
def get_team_detail(team_id: int, db: Session = Depends(get_db)) -> TeamDetailOut:
    team = team_service.get_team_or_404(db, team_id)
    return _to_detail(db, team)


@router.post("", response_model=TeamDetailOut, status_code=201)
def create_team(payload: TeamCreateRequest, db: Session = Depends(get_db)) -> TeamDetailOut:
    team = team_service.create_team(db, payload.name)
    return _to_detail(db, team)


@router.patch("/{team_id}", response_model=TeamDetailOut)
def rename_team(team_id: int, payload: TeamUpdateRequest, db: Session = Depends(get_db)) -> TeamDetailOut:
    team = team_service.get_team_or_404(db, team_id)
    team = team_service.rename_team(db, team, payload.name)
    return _to_detail(db, team)


@router.post("/{team_id}/set-default", response_model=TeamDetailOut)
def set_default_team(team_id: int, db: Session = Depends(get_db)) -> TeamDetailOut:
    team = team_service.get_team_or_404(db, team_id)
    team = team_service.set_default_team(db, team)
    return _to_detail(db, team)


@router.post("/{team_id}/members", response_model=TeamMemberOut, status_code=201)
def add_member(team_id: int, payload: AddTeamMemberRequest, db: Session = Depends(get_db)) -> TeamMemberOut:
    team_service.get_team_or_404(db, team_id)
    return team_service.add_member(db, team_id, payload.user_id, payload.role_id)


@router.patch("/{team_id}/members/{member_id}", response_model=TeamMemberOut)
def update_member_role(
    team_id: int, member_id: int, payload: UpdateTeamMemberRoleRequest, db: Session = Depends(get_db)
) -> TeamMemberOut:
    return team_service.update_member_role(db, team_id, member_id, payload.role_id)


@router.delete("/{team_id}/members/{member_id}", status_code=204)
def remove_member(team_id: int, member_id: int, db: Session = Depends(get_db)) -> None:
    team_service.remove_member(db, team_id, member_id)
