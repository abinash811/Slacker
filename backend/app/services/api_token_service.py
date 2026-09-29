"""Personal keys for the MCP server (see app/mcp/). A key is shown once at
creation; we store only its SHA-256 hash, so a database leak doesn't leak
working keys.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.api_token import ApiToken
from app.models.user import User

KEY_PREFIX = "slk_"
MAX_ACTIVE_TOKENS = 10
# Writing last_used_at on every call would turn each read into a write.
_LAST_USED_RESOLUTION = timedelta(minutes=5)


def _hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def list_tokens(db: Session, user: User) -> list[ApiToken]:
    return list(
        db.execute(
            select(ApiToken)
            .where(ApiToken.user_id == user.id, ApiToken.revoked_at.is_(None))
            .order_by(ApiToken.created_at.desc())
        ).scalars()
    )


def create_token(db: Session, user: User, name: str) -> tuple[ApiToken, str]:
    """Returns the stored row and the plaintext key (never retrievable again)."""
    if len(list_tokens(db, user)) >= MAX_ACTIVE_TOKENS:
        raise HTTPException(status_code=400, detail=f"You can have up to {MAX_ACTIVE_TOKENS} keys. Revoke one you no longer use.")
    key = KEY_PREFIX + secrets.token_urlsafe(32)
    token = ApiToken(user_id=user.id, name=name.strip(), token_hash=_hash(key), prefix=key[:12])
    db.add(token)
    db.commit()
    db.refresh(token)
    return token, key


def revoke_token(db: Session, user: User, token_id: int) -> None:
    token = db.get(ApiToken, token_id)
    if token is None or token.user_id != user.id or token.revoked_at is not None:
        raise HTTPException(status_code=404, detail="Key not found")
    token.revoked_at = datetime.now(timezone.utc)
    db.commit()


def authenticate(db: Session, key: str) -> User | None:
    """The user a key belongs to, or None if it's unknown or revoked."""
    if not key.startswith(KEY_PREFIX):
        return None
    token = db.execute(
        select(ApiToken).where(ApiToken.token_hash == _hash(key), ApiToken.revoked_at.is_(None))
    ).scalar_one_or_none()
    if token is None:
        return None
    now = datetime.now(timezone.utc)
    if token.last_used_at is None or now - token.last_used_at > _LAST_USED_RESOLUTION:
        token.last_used_at = now
        db.commit()
    return token.user
