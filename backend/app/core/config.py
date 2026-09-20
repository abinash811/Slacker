from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central app configuration, sourced from environment variables.

    Keeping every external dependency (DB, Slack, auth) behind this one
    object means swapping providers later (e.g. RDS instead of local
    Postgres, company SSO instead of dev auth) never touches business logic.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = "postgresql+psycopg://slacker:slacker@localhost:5432/slacker"

    backend_cors_origins: str = "http://localhost:5173"

    dev_default_user_email: str = "admin@example.com"

    slack_bot_token: str = ""
    slack_signing_secret: str = ""
    slack_app_token: str = ""
    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_use_socket_mode: bool = False
    slack_default_channel_id: str = ""
    slack_workspace_domain: str = ""  # optional: enables "Open in Slack" links

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
