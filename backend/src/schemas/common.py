"""Shared helpers for validating JSON request bodies with Pydantic."""

from __future__ import annotations

from typing import TypeVar

from flask import Request, jsonify
from flask.wrappers import Response
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


def parse_json(
    request: Request,
    model: type[T],
    *,
    allow_empty: bool = False,
) -> tuple[T | None, tuple[Response, int] | None]:
    """
    Parse ``request.get_json()`` into ``model``.

    Returns ``(instance, None)`` on success, or ``(None, (response, status))`` on failure.
    """
    raw = request.get_json(silent=True)
    if raw is None:
        if allow_empty:
            raw = {}
        else:
            return None, (
                jsonify({"success": False, "error": "JSON body required"}),
                400,
            )
    if not isinstance(raw, dict):
        return None, (
            jsonify({"success": False, "error": "JSON body must be an object"}),
            400,
        )
    try:
        return model.model_validate(raw), None
    except ValidationError as e:
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": "Validation failed",
                    "details": e.errors(include_url=False),
                }
            ),
            422,
        )
