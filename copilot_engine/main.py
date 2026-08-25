# copilot_engine/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from copilot_engine.core.logging_config import (
    setup_logging,
)

from copilot_engine.middleware.request_context_middleware import (
    RequestContextMiddleware,
)

from copilot_engine.routes.copilot import (
    router as copilot_router,
)

from copilot_engine.routes.report_routes import (
    router as report_router,
)

from fastapi.staticfiles import StaticFiles


from copilot_engine.core.config import settings

setup_logging()

app = FastAPI(
    title="Coach Genie Copilot Engine",
    docs_url=None if settings.PRODUCTION else "/docs",
    redoc_url=None if settings.PRODUCTION else "/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://coachgenie-phase1.onrender.com",
        "https://coachgenie-frontend.onrender.com",
        "https://thecoachgenie.in",
        "https://www.thecoachgenie.in",
        "https://app.thecoachgenie.in"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    RequestContextMiddleware
)

import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("copilot_engine")

from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def copilot_starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )

@app.exception_handler(HTTPException)
async def copilot_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )

@app.exception_handler(SQLAlchemyError)
async def copilot_sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Copilot database execution exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "A database operation error occurred during AI processing."},
    )

@app.exception_handler(Exception)
async def copilot_global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled copilot exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "An error occurred during AI processing. Please try again later."},
    )

app.include_router(
    copilot_router
)

app.include_router(
    report_router
)

from pathlib import Path
REPORTS_DIR = Path("generated_reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/generated_reports",
    StaticFiles(directory=str(REPORTS_DIR)),
    name="generated_reports",
)

# app.mount(
#     "/reports-static",
#     StaticFiles(directory="generated_reports"),
#     name="reports-static",
# )

@app.get("/health")
async def health():

    return {
        "status": "ok",
        "service": "copilot_engine",
    }
