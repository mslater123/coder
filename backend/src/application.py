"""Flask application factory (delegates to :mod:`src.core.app_factory`)."""

from src.core.app_factory import create_app

__all__ = ["create_app"]
