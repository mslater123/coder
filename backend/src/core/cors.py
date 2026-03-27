"""Global CORS for the API (development-friendly defaults)."""

from flask import Flask
from flask_cors import CORS


def init_cors(app: Flask) -> None:
    CORS(
        app,
        origins="*",
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-User-Id"],
        supports_credentials=False,
    )
