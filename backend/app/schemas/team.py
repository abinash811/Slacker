from pydantic import BaseModel, ConfigDict, Field

from app.schemas.role import RoleOut
from app.schemas.user import UserOut


class TeamCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TeamUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user: UserOut
    role: RoleOut


class TeamDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    members: list[TeamMemberOut]


class AddTeamMemberRequest(BaseModel):
    user_id: int
    role_id: int


class UpdateTeamMemberRoleRequest(BaseModel):
    role_id: int
