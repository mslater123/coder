"""
Shared helpers (JSON, HTTP, auth-style headers, text, datetime).

Prefer importing from submodules when only a few symbols are needed::

    from src.utils.auth_request import get_current_user_id, USER_ID_HEADER
"""

from src.utils.auth_request import USER_ID_HEADER, get_current_user_id
from src.utils.datetime_utils import parse_iso_datetime, to_iso, utc_now
from src.utils.http import get_request_json
from src.utils.json_utils import safe_json_dumps, safe_json_loads
from src.utils.text import truncate
from src.utils.fs import is_path_inside_directory

__all__ = [
    "USER_ID_HEADER",
    "get_current_user_id",
    "get_request_json",
    "parse_iso_datetime",
    "safe_json_dumps",
    "safe_json_loads",
    "to_iso",
    "truncate",
    "utc_now",
    "is_path_inside_directory",
]
