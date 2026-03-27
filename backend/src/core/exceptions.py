"""Application-level errors (extend handlers / services as needed)."""


class AppError(Exception):
    """Base class for domain errors that should map to HTTP responses."""

    def __init__(self, message: str, *, status_code: int = 400, code: str | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", *, code: str | None = None):
        super().__init__(message, status_code=404, code=code)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden", *, code: str | None = None):
        super().__init__(message, status_code=403, code=code)


class ValidationAppError(AppError):
    def __init__(self, message: str, *, code: str | None = "validation_error"):
        super().__init__(message, status_code=422, code=code)
