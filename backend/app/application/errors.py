class ApplicationError(Exception):
    message = "Application error"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message

    @property
    def payload(self) -> dict[str, object]:
        return {"error": self.message}


class AuthError(ApplicationError):
    message = "Auth required"


class PermissionDeniedError(ApplicationError):
    message = "Permission denied"


class NotFoundError(ApplicationError):
    message = "Resource not found"


class BadRequestError(ApplicationError):
    message = "Bad request"


class ValidationFailedError(ApplicationError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("Validation failed")
        self.errors = errors

    @property
    def payload(self) -> dict[str, object]:
        return {"errors": self.errors}
