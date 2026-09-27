from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="APIx")
    app_env: str = Field(default="development")
    api_env: str = Field(default="development")
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    data_mode: str = Field(default="api")
    backend_cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
    )
    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5432/apix")
    flightapi_api_key: str | None = Field(default=None)
    flightapi_base_url: str = Field(default="https://api.flightapi.io")
    flightapi_timeout_seconds: float = Field(default=60.0)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
