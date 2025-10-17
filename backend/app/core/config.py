"""Application configuration settings."""

from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Environment-backed configuration values."""

    app_name: str = "StegoVision Backend"
    api_prefix: str = "/api/v1"
    default_passphrase: str | None = None
    max_message_bytes: int = Field(default=512 * 1024, description="Upper bound for messages in bytes")
    detection_sample_size: int = Field(default=50_000, description="Number of samples to inspect during detection")
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"],
        description="Origins permitted to access the API",
    )

    class Config:
        env_prefix = "STEGOVISION_"
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Provide a cached Settings instance."""

    return Settings()
