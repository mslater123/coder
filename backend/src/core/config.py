"""Environment-driven Flask configuration."""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask

DEFAULT_MAX_UPLOAD_BYTES = 16 * 1024 * 1024


def apply_flask_config(app: Flask, *, backend_root: Path) -> None:
    """Set ``app.config`` keys used by Coder (database, uploads, SQLAlchemy)."""
    instance_path = backend_root / "instance"
    instance_path.mkdir(parents=True, exist_ok=True)
    database_path = instance_path / "coder.db"
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{database_path}")

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = str(backend_root / "uploads" / "profiles")
    app.config["MAX_CONTENT_LENGTH"] = int(
        os.getenv("MAX_CONTENT_LENGTH", str(DEFAULT_MAX_UPLOAD_BYTES))
    )

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
