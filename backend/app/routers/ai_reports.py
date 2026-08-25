import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_

from app.dependencies import get_tenant, require_roles, DB
from app.models.student import Student
from app.models.batch import Batch
from app.services.ai_report import AIReportService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai-reports",
    tags=["AI Reports"],
)

# =========================================================
# STUDENT PERFORMANCE REPORT
# =========================================================

@router.post(
    "/students/{student_id}/performance",
)
async def generate_student_performance_report(
    student_id: str,
    db: DB,
    tenant=Depends(get_tenant),
    current_user=Depends(
        require_roles("owner", "tutor", "counselor", "student", "parent")
    ),
):
    """
    Generate AI-powered student performance intelligence report with ownership validation.
    """
    # Enforce ownership check for student & parent roles
    if current_user.role == "student":
        res = await db.execute(
            select(Student).where(
                and_(Student.tenant_id == tenant.id, Student.user_id == current_user.id)
            )
        )
        linked = res.scalar_one_or_none()
        if not linked or str(linked.id) != student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "parent":
        res = await db.execute(
            select(Student).where(
                and_(Student.tenant_id == tenant.id, Student.parent_email == current_user.email)
            )
        )
        linked = res.scalar_one_or_none()
        if not linked or str(linked.id) != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        logger.info(
            "API request received for student performance report",
            extra={"student_id": student_id, "tenant_id": str(tenant.id)},
        )

        response = await AIReportService.generate_student_performance_report(
            student_id=student_id,
        )
        return response

    except HTTPException:
        raise
    except Exception:
        logger.exception("Student performance report route failure")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate student performance report.",
        )


# =========================================================
# ATTENDANCE & ENGAGEMENT REPORT
# =========================================================

@router.post(
    "/students/{student_id}/attendance-engagement",
)
async def generate_attendance_engagement_report(
    student_id: str,
    db: DB,
    tenant=Depends(get_tenant),
    current_user=Depends(
        require_roles("owner", "tutor", "counselor", "student", "parent")
    ),
):
    """
    Generate attendance & engagement intelligence report with ownership validation.
    """
    # Enforce ownership check for student & parent roles
    if current_user.role == "student":
        res = await db.execute(
            select(Student).where(
                and_(Student.tenant_id == tenant.id, Student.user_id == current_user.id)
            )
        )
        linked = res.scalar_one_or_none()
        if not linked or str(linked.id) != student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "parent":
        res = await db.execute(
            select(Student).where(
                and_(Student.tenant_id == tenant.id, Student.parent_email == current_user.email)
            )
        )
        linked = res.scalar_one_or_none()
        if not linked or str(linked.id) != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        logger.info(
            "API request received for attendance report",
            extra={"student_id": student_id, "tenant_id": str(tenant.id)},
        )

        response = await AIReportService.generate_attendance_engagement_report(
            student_id=student_id,
        )
        return response

    except HTTPException:
        raise
    except Exception:
        logger.exception("Attendance report route failure")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate attendance report.",
        )


# =========================================================
# BATCH PERFORMANCE REPORT
# =========================================================

@router.post(
    "/batches/{batch_id}/performance",
)
async def generate_batch_performance_report(
    batch_id: str,
    db: DB,
    tenant=Depends(get_tenant),
    current_user=Depends(require_roles("owner", "tutor", "counselor")),
):
    """
    Generate AI-powered batch performance report for staff roles.
    """
    # Verify batch belongs to current tenant
    batch_res = await db.execute(
        select(Batch).where(
            and_(Batch.id == batch_id, Batch.tenant_id == tenant.id)
        )
    )
    if not batch_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Batch not found")

    try:
        logger.info(
            "API request received for batch performance report",
            extra={"batch_id": batch_id, "tenant_id": str(tenant.id)},
        )

        response = await AIReportService.generate_batch_performance_report(
            batch_id=batch_id,
        )
        return response

    except HTTPException:
        raise
    except Exception:
        logger.exception("Batch report route failure")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate batch performance report.",
        )