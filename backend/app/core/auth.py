"""Authentication abstraction.

V1 has no real login system by design (see spec section 14) — the company's
own auth/SSO will be integrated later. Everything that needs "who is the
current user" depends only on the `AuthProvider` interface below via the
`get_current_user` FastAPI dependency, never on how that user was resolved.

Swapping to company SSO later means: implement a new `AuthProvider`
(e.g. validating a JWT/session from the internal auth API) and change the
one line in `get_current_user` that constructs the provider. No router or
service code changes.
"""

from abc import ABC, abstractmethod

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User


class AuthProvider(ABC):
    @abstractmethod
    def resolve_user(self, db: Session) -> User | None:
        """Return the current user, or None if unauthenticated."""


class DevAuthProvider(AuthProvider):
    """Resolves the current user from a header, falling back to a
    configured default. Lets the dashboard offer a "dev user switcher"
    without any real authentication — purely a V1 convenience.
    """

    def __init__(self, email: str | None):
        self._email = email or get_settings().dev_default_user_email

    def resolve_user(self, db: Session) -> User | None:
        return db.query(User).filter(User.email == self._email).first()


def get_current_user(
    db: Session = Depends(get_db),
    x_dev_user_email: str | None = Header(default=None),
) -> User:
    provider: AuthProvider = DevAuthProvider(email=x_dev_user_email)
    user = provider.resolve_user(db)
    if user is None:
        raise HTTPException(status_code=401, detail="No user resolved for this request")
    return user
