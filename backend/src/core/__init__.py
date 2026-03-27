"""
Core application infrastructure: paths, config, CORS, DB migrations, blueprint wiring, app factory.
"""

from src.core.app_factory import create_app
from src.core.constants import API_SERVICE_NAME, HEALTH_PATH
from src.core.exceptions import AppError, ForbiddenError, NotFoundError, ValidationAppError
from src.core.paths import BACKEND_ROOT

__all__ = [
    "API_SERVICE_NAME",
    "BACKEND_ROOT",
    "HEALTH_PATH",
    "AppError",
    "ForbiddenError",
    "NotFoundError",
    "ValidationAppError",
    "create_app",
]
