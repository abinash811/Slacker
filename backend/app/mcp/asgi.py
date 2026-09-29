"""HTTP wiring for the MCP server: a personal-key check in front of the
SDK's Streamable HTTP app, mounted at /mcp by app.main.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import anyio.to_thread
from mcp.server.transport_security import TransportSecuritySettings
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.mcp.server import mcp
from app.services import api_token_service


def _user_id_for(key: str) -> int | None:
    with SessionLocal() as db:
        user = api_token_service.authenticate(db, key)
        return user.id if user else None


class RequireApiKey:
    """Rejects calls without a valid personal key (Authorization: Bearer slk_…)
    and passes the caller's user id to tools via the request state."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        header = dict(scope["headers"]).get(b"authorization", b"").decode()
        key = header[7:].strip() if header[:7].lower() == "bearer " else ""
        user_id = await anyio.to_thread.run_sync(_user_id_for, key) if key else None
        if user_id is None:
            response = JSONResponse(
                {
                    "error": "invalid_token",
                    "error_description": "Missing or revoked key. Create one on the Connect page of the dashboard.",
                },
                status_code=401,
                headers={"WWW-Authenticate": 'Bearer realm="slacker"'},
            )
            await response(scope, receive, send)
            return
        scope.setdefault("state", {})["user_id"] = user_id
        await self.app(scope, receive, send)


def _transport_security() -> TransportSecuritySettings:
    # Guards against DNS rebinding: only our own host names are accepted.
    public = urlparse(get_settings().public_api_url)
    hosts = ["127.0.0.1:*", "localhost:*", "[::1]:*"]
    origins = ["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"]
    if public.hostname and public.hostname not in ("localhost", "127.0.0.1"):
        hosts += [public.hostname, f"{public.hostname}:*"]
        origins += [f"{public.scheme}://{public.hostname}", f"{public.scheme}://{public.hostname}:*"]
    return TransportSecuritySettings(enable_dns_rebinding_protection=True, allowed_hosts=hosts, allowed_origins=origins)


class McpEndpoint:
    """The /mcp endpoint. The SDK's session manager can run only once, so a
    fresh one is built each time the app starts (see `running`)."""

    def __init__(self) -> None:
        self._http_app: ASGIApp | None = None
        self.asgi = RequireApiKey(self._dispatch)

    async def _dispatch(self, scope: Scope, receive: Receive, send: Send) -> None:
        if self._http_app is None:
            raise RuntimeError("MCP endpoint used before app startup")
        await self._http_app(scope, receive, send)

    @asynccontextmanager
    async def running(self) -> AsyncIterator[None]:
        # Stateless + JSON responses: no sticky sessions, works behind any
        # load balancer, and every call is a plain request/response.
        self._http_app = mcp.streamable_http_app(
            streamable_http_path="/mcp",
            stateless_http=True,
            json_response=True,
            transport_security=_transport_security(),
        )
        try:
            async with mcp.session_manager.run():
                yield
        finally:
            self._http_app = None


mcp_endpoint = McpEndpoint()
