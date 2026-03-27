"""Extract identity hints from Flask requests (dev header / JSON body)."""

from __future__ import annotations

from flask import Request

USER_ID_HEADER = "X-User-Id"


def get_current_user_id(request: Request) -> str | None:
    """
    Current user id from ``X-User-Id`` header, then JSON ``current_user_id`` or ``user_id``.

    Uses silent JSON parsing so malformed bodies do not raise.
    """
    raw = request.headers.get(USER_ID_HEADER)
    if raw is not None:
        s = str(raw).strip()
        if s:
            return s

    data = request.get_json(silent=True)
    if isinstance(data, dict):
        for key in ("current_user_id", "user_id"):
            uid = data.get(key)
            if uid is not None:
                s = str(uid).strip()
                if s:
                    return s
    return None
