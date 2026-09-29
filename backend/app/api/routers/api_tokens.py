from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.api_token import ApiTokenCreated, ApiTokenCreateRequest, ApiTokenOut, McpInfo
from app.services import api_token_service

# Keys are personal: every route acts on the current user's keys only.
router = APIRouter(tags=["mcp"])


@router.get("/mcp-info", response_model=McpInfo)
def mcp_info() -> McpInfo:
    return McpInfo(url=get_settings().mcp_url)


@router.get("/me/tokens", response_model=list[ApiTokenOut])
def list_tokens(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ApiTokenOut]:
    return api_token_service.list_tokens(db, user)


@router.post("/me/tokens", response_model=ApiTokenCreated, status_code=201)
def create_token(
    payload: ApiTokenCreateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ApiTokenCreated:
    token, key = api_token_service.create_token(db, user, payload.name)
    return ApiTokenCreated(**ApiTokenOut.model_validate(token).model_dump(), key=key)


@router.delete("/me/tokens/{token_id}", status_code=204)
def revoke_token(token_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    api_token_service.revoke_token(db, user, token_id)
