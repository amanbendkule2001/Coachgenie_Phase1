import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine
from app.scheduler import start_scheduler, scheduler
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

import app.models  # noqa: F401

from app.routers import (
    auth, tenants, leads, students, admissions,
    batches, attendance, exams, fees, notifications, ai,
    parents, tutors, admins, growth_cards, auth_extended,
    dashboard, syllabus, inbox_notification,
)
from app.routers.ai_reports import router as ai_reports_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("coaching_erp")


from app.database import engine, Base
import app.models  # ensure models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")

    try:
        from app.services.tenant_provisioning import ensure_demo_tenant
        await ensure_demo_tenant()
    except Exception as e:
        logger.warning(f"Demo tenant initialization note: {e}")

    import os
    if os.getenv("ALLOW_SEED", "false").lower() in ("true", "1"):
        try:
            from seed import seed
            await seed()
        except Exception as e:
            logger.info(f"Seed note: {e}")

    start_scheduler()
    yield
    scheduler.shutdown()
    await engine.dispose()


tags_metadata = [
    {"name": "Auth", "description": "Authentication, JWT tokens, session management, and password reset workflows."},
    {"name": "Tenants", "description": "Multi-tenant coaching institute management and subdomain provisioning."},
    {"name": "Leads", "description": "Sales CRM pipeline, prospective student lead management, and conversion tracking."},
    {"name": "Admissions", "description": "Student registration forms, document verification, and admission approval."},
    {"name": "Students", "description": "Enrolled student profiles, academic rosters, and emergency contact details."},
    {"name": "Batches", "description": "Course batch scheduling, faculty allocations, and class sessions."},
    {"name": "Attendance", "description": "Daily student attendance marking, absent alerts, and historical percentage reports."},
    {"name": "Exams", "description": "Examination creation, student mark entry, class rankings, and report cards."},
    {"name": "Fees", "description": "Course fee structures, student invoices, partial payment settlements, and PDF receipts."},
    {"name": "Growth Cards", "description": "360-degree student performance evaluations, soft skills, and faculty remarks."},
    {"name": "AI", "description": "Context-aware Groq LLaMA 3 study assistance and interactive learning copilot."},
    {"name": "Notifications", "description": "System alerts, payment due reminders, and inbox notifications."},
    {"name": "Dashboard", "description": "Executive dashboard statistics, revenue metrics, and operational KPIs."},
]

app = FastAPI(
    title=f"{settings.APP_NAME} Multi-Tenant REST API",
    description="""
### CoachGenie Enterprise ERP API Specification

Welcome to the official API documentation for **CoachGenie Phase 1**.

#### 🔑 Authentication & Headers
* **Bearer Token**: `Authorization: Bearer <access_token>`
* **Tenant Isolation**: `X-Tenant-Id: <tenant_uuid>` or `X-Tenant-Subdomain: <subdomain>`

#### 📚 Documentation Endpoints
* **Swagger UI**: `/docs`
* **ReDoc Interface**: `/redoc`
* **OpenAPI Schema**: `/openapi.json`
""",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     logger.error(f"Unhandled exception: {exc}", exc_info=True)
#     return JSONResponse(
#         status_code=500,
#         content={"success": False, "message": "Internal server error"},
#     )
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback

    traceback.print_exc()
    logger.error("Unhandled exception: %s — %s", type(exc).__name__, exc)

    if settings.DEBUG:
        detail = {"message": str(exc), "type": type(exc).__name__}
    else:
        detail = {"message": "An internal server error occurred. Please try again later."}

    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"success": False, **detail},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


PREFIX = "/api/v1"
app.include_router(tenants.router,            prefix=PREFIX)
app.include_router(auth.router,               prefix=PREFIX)
app.include_router(leads.router,              prefix=PREFIX)
app.include_router(students.router,           prefix=PREFIX)
app.include_router(admissions.router,         prefix=PREFIX)
app.include_router(batches.router,            prefix=PREFIX)
app.include_router(attendance.router,         prefix=PREFIX)
app.include_router(exams.router,              prefix=PREFIX)
app.include_router(fees.router,               prefix=PREFIX)
app.include_router(notifications.router,      prefix=PREFIX)
app.include_router(ai.router,                 prefix=PREFIX)
app.include_router(growth_cards.router,       prefix=PREFIX)
app.include_router(auth_extended.router,      prefix=PREFIX)
app.include_router(dashboard.router,          prefix=PREFIX)
app.include_router(ai_reports_router,         prefix=PREFIX)
app.include_router(syllabus.router,           prefix=PREFIX)
app.include_router(parents.router,            prefix=PREFIX)
app.include_router(tutors.router,             prefix=PREFIX)
app.include_router(admins.router,             prefix=PREFIX)
app.include_router(inbox_notification.router, prefix=PREFIX)
# FIX BUG-001: removed duplicate app.include_router(ai_reports_router) that was here