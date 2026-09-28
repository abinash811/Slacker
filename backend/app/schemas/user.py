from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    slack_user_id: str | None = None
    avatar_url: str | None = None


class SettingsPermissions(BaseModel):
    create: bool
    edit: bool
    delete: bool


class MeOut(BaseModel):
    """The current user and what they may do in Settings (see app.core.permissions)."""

    user: UserOut
    settings: SettingsPermissions
