from fastapi import APIRouter, Request
from slack_bolt.adapter.fastapi import SlackRequestHandler

from app.slack.bolt_app import bolt_app

router = APIRouter(prefix="/slack", tags=["slack"])
_handler = SlackRequestHandler(bolt_app)


@router.post("/events")
async def slack_events(req: Request):
    """Single HTTP entry point for Slack Events API, interactivity
    (buttons/modals), and slash commands — Slack Bolt dispatches internally
    based on the payload shape. Signature verification happens inside
    `_handler.handle` via the app's signing secret.
    """
    return await _handler.handle(req)
