"""Datetime helpers (timezone-naive UTC for SQLAlchemy defaults)."""

from __future__ import annotations

from datetime import datetime


def utc_now() -> datetime:
    """Naive UTC ``datetime`` (matches existing ``datetime.utcnow`` usage)."""
    return datetime.utcnow()


def to_iso(value: datetime | None) -> str | None:
    """ISO 8601 string or ``None``."""
    if value is None:
        return None
    return value.isoformat()


def parse_iso_datetime(value: str | None) -> datetime | None:
    """Parse ISO date/datetime strings (supports trailing ``Z``)."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
