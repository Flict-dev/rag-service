from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.api.routes import router
from backend.app.application.errors import (
    ApplicationError,
    AuthError,
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    ValidationFailedError,
)
from backend.app.shared.config import get_settings


settings = get_settings()
app = FastAPI(title="RAG Base API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-User-Id"],
)


@app.exception_handler(ApplicationError)
async def application_error_handler(_: Request, exc: ApplicationError) -> JSONResponse:
    status_code = 500

    if isinstance(exc, AuthError):
        status_code = 401
    elif isinstance(exc, PermissionDeniedError):
        status_code = 403
    elif isinstance(exc, NotFoundError):
        status_code = 404
    elif isinstance(exc, (BadRequestError, ValidationFailedError)):
        status_code = 400

    return JSONResponse(status_code=status_code, content=exc.payload)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [error["msg"] for error in exc.errors()]
    return JSONResponse(status_code=422, content={"errors": errors})


app.include_router(router)
