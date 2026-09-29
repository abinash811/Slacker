from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.mcp.asgi import mcp_endpoint
from app.slack.router import router as slack_router

configure_logging()
settings = get_settings()

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # A mounted app's own lifespan never runs, so the MCP server is started here.
    async with mcp_endpoint.running():
        yield


app = FastAPI(title="Support Operations Platform", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(slack_router)
# MCP server for AI assistants (Claude, Cursor…); see app/mcp/.
app.add_route("/mcp", mcp_endpoint.asgi, include_in_schema=False)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
