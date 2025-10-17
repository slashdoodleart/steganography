"""Structured logging utilities."""

from __future__ import annotations

import logging
from typing import Any

import structlog

from .config import get_settings


def configure_logging() -> None:
    """Configure structlog and standard logging."""

    settings = get_settings()

    timestamper = structlog.processors.TimeStamper(fmt="iso")

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            timestamper,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer() if settings.structured_logging else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, settings.log_level.upper(), logging.INFO)),
    )

    logging.basicConfig(level=settings.log_level.upper())


def log_operation(event: str, **data: Any) -> None:
    """Helper for structured operation logging."""

    logger = structlog.get_logger("stegresearch")
    logger.info(event, **data)
