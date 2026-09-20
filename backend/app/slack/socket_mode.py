"""Dev-only entrypoint: `python -m app.slack.socket_mode`.

Runs the same Bolt app over Socket Mode so it can be developed against
without a public HTTPS URL. Production should always run the HTTP Events
API path (`app.slack.router`, mounted in `app.main`) — see
docs/ARCHITECTURE.md for why Socket Mode is dev-only here.
"""

import logging

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.slack.bolt_app import bolt_app


def main() -> None:
    # Unlike app.main (imported by uvicorn, which calls this at module load
    # time), this script is its own process entrypoint — logging must be
    # configured explicitly here, or Slack Bolt's connection status/error
    # logs are silently dropped (Python's default "no handlers configured"
    # behavior only surfaces WARNING+ to stderr, so INFO-level connection
    # logs never appear in `docker compose logs`).
    configure_logging()
    logger = logging.getLogger(__name__)

    settings = get_settings()
    if not settings.slack_app_token:
        raise SystemExit("SLACK_APP_TOKEN is required for Socket Mode (starts with xapp-)")

    from slack_bolt.adapter.socket_mode import SocketModeHandler

    logger.info("Starting Slack Socket Mode connection...")
    SocketModeHandler(bolt_app, settings.slack_app_token).start()


if __name__ == "__main__":
    main()
