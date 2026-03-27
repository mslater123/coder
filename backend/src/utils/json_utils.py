"""JSON helpers for API and stored text fields."""

from __future__ import annotations

import json
from typing import Any, TypeVar

T = TypeVar("T")


def safe_json_loads(raw: str | None, *, default: T | None = None) -> Any | T | None:
    """Parse JSON string; return ``default`` on empty input or parse errors."""
    if raw is None or raw == "":
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def safe_json_dumps(obj: Any, *, default: str | None = None) -> str | None:
    """Serialize to JSON string; return ``default`` for non-serializable input."""
    try:
        return json.dumps(obj, default=str)
    except (TypeError, ValueError):
        return default
