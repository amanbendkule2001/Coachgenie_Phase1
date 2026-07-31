# NEW CODE

# copilot_engine/repositories/student_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, inspect

from copilot_engine.models.report_models import (
    StudentRead,
    AttendanceRecordRead,
    AttendanceSessionRead,
    ExamResultRead,
    FeeInvoiceRead,
    GrowthCardRead,
)


def _to_dict(obj) -> dict:
    """Convert a SQLAlchemy model instance into a plain JSON-safe dict."""
    if obj is None:
        return {}
    return {
        col.key: getattr(obj, col.key)
        for col in inspect(obj).mapper.column_attrs
    }


class StudentRepository:
    """
    Read-only repository for student report data.
    Queries the shared database directly (copilot_engine and backend
    are separate services but share one Postgres instance).
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student(self, tenant_id: str, student_id: str) -> dict:
        result = await self.db.execute(
            select(StudentRead).where(
                and_(
                    StudentRead.id == student_id,
                    StudentRead.tenant_id == tenant_id,
                )
            )
        )
        student = result.scalar_one_or_none()
        return _to_dict(student)

    async def get_attendance_summary(self, tenant_id: str, student_id: str) -> dict:
        result = await self.db.execute(
            select(AttendanceRecordRead.status, func.count())
            .where(
                and_(
                    AttendanceRecordRead.student_id == student_id,
                    AttendanceRecordRead.tenant_id == tenant_id,
                )
            )
            .group_by(AttendanceRecordRead.status)
        )
        counts = dict(result.all())
        total = sum(counts.values())
        present = counts.get("present", 0)
        return {
            "total_sessions": total,
            "present": present,
            "absent": counts.get("absent", 0),
            "attendance_percent": round((present / total) * 100, 2) if total else 0.0,
        }

    async def get_exam_results(self, tenant_id: str, student_id: str) -> list:
        result = await self.db.execute(
            select(ExamResultRead).where(
                and_(
                    ExamResultRead.student_id == student_id,
                    ExamResultRead.tenant_id == tenant_id,
                )
            )
        )
        return [_to_dict(r) for r in result.scalars().all()]

    async def get_fee_summary(self, tenant_id: str, student_id: str) -> dict:
        result = await self.db.execute(
            select(FeeInvoiceRead).where(
                and_(
                    FeeInvoiceRead.student_id == student_id,
                    FeeInvoiceRead.tenant_id == tenant_id,
                )
            )
        )
        invoices = result.scalars().all()
        total_due = sum(float(i.amount_due) for i in invoices)
        total_paid = sum(float(i.amount_paid) for i in invoices)
        return {
            "total_due": total_due,
            "total_paid": total_paid,
            "outstanding": total_due - total_paid,
            "invoices": [_to_dict(i) for i in invoices],
        }

    async def get_growth_cards(self, tenant_id: str, student_id: str) -> list:
        result = await self.db.execute(
            select(GrowthCardRead)
            .where(
                and_(
                    GrowthCardRead.student_id == student_id,
                    GrowthCardRead.tenant_id == tenant_id,
                )
            )
            .order_by(GrowthCardRead.created_at.desc())
        )
        return [_to_dict(c) for c in result.scalars().all()]

# from sqlalchemy.ext.asyncio import AsyncSession

# from copilot_engine.services.backend_client import (
#     BackendClient,
# )

# from copilot_engine.schemas.request_context import (
#     RequestContext,
# )

# from copilot_engine.services import (
#     student_service,
#     exam_service,
#     fee_service,
#     growth_service,
# )


# class StudentRepository:
#     """
#     Repository responsible only for fetching student-related data.

#     No business logic.
#     No analytics.
#     No calculations.
#     """

#     def __init__(self, db: AsyncSession):
#         self.db = db

#     async def get_student(
#         self,
#         tenant_id: str,
#         student_id: str,
#     ):
#         return await student_service.get_student(
#             self.db,
#             tenant_id,
#             student_id,
#         )

#     async def get_students(
#         self,
#         tenant_id: str,
#         page: int = 1,
#         limit: int = 20,
#         search: str | None = None,
#     ):
#         return await student_service.get_students(
#             self.db,
#             tenant_id,
#             page,
#             limit,
#             search,
#         )

#     async def get_exam_results(
#         self,
#         tenant_id: str,
#         exam_id: str,
#     ):
#         return await exam_service.get_results(
#             self.db,
#             tenant_id,
#             exam_id,
#         )

#     async def get_student_invoices(
#         self,
#         tenant_id: str,
#         student_id: str,
#     ):
#         return await fee_service.get_student_invoices(
#             self.db,
#             tenant_id,
#             student_id,
#         )

#     async def get_growth_cards(
#         self,
#         tenant_id: str,
#         student_id: str,
#     ):
#         return await growth_service.get_student_growth_cards(
#             self.db,
#             tenant_id,
#             student_id,
#         )