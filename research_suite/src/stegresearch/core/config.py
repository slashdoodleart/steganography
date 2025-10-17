"""Application configuration and deterministic seed management."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Global configuration for the research suite."""

    api_host: str = Field(default="127.0.0.1")
    api_port: int = Field(default=8000)
    data_dir: Path = Field(default_factory=lambda: Path("data"))
    artifact_dir: Path = Field(default_factory=lambda: Path("artifacts"))
    allow_external_networks: bool = Field(default=False)
    default_seed: int = Field(default=1337)
    structured_logging: bool = Field(default=True)
    log_level: str = Field(default="INFO")

    model_config = {
        "env_prefix": "STEG_",
    }


@lru_cache(maxsize=1)
def get_settings(overrides: Optional[dict[str, object]] = None) -> Settings:
    """Return cached settings instance."""

    if overrides:
        return Settings(**overrides)
    return Settings()
