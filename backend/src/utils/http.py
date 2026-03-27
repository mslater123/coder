"""Flask request helpers."""

from __future__ import annotations

from typing import Any

from flask import Request


def get_request_json(request: Request, *, default: dict[str, Any] | None = None) -> dict[str, Any]:
    """``request.get_json(silent=True)`` normalized to a dict."""
    if default is None:
        default = {}
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else default
