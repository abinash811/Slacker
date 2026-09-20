"""Dev-only entrypoint: `python -m app.slack.socket_mode`.

Runs the same Bolt app over Socket Mode so it can be developed against
without a public HTTPS URL. Production should always run the HTTP Events
API path (`app.slack.router`, mounted in `app.main`) — see
docs/ARCHITECTURE.md for why Socket Mode is dev-only here.
"""

from app.core.config import get_settings
from app.slack.bolt_app import bolt_app


def main() -> None:
    settings = get_settings()
    if not settings.slack_app_token:
        raise SystemExit("SLACK_APP_TOKEN is required for Socket Mode (starts with xapp-)")

    from slack_bolt.adapter.socket_mode import SocketModeHandler

    SocketModeHandler(bolt_app, settings.slack_app_token).start()


if __name__ == "__main__":
    main()
