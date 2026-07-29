# NEW CODE

# copilot_engine/repositories/batch_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, inspect

from copilot_engine.models.report_models import (
    BatchRead,
    BatchStudentRead,
    ClassRead,
    StudentRead,
    AttendanceRecordRead,
    AttendanceSessionRead,
    ExamResultRead,
)


def _to_dict(obj) -> dict:
    if obj is None:
        return {}
    return {col.key: getattr(obj, col.key) for col in inspect(obj).mapper.column_attrs}


class BatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_batch(self, tenant_id: str, batch_id: str) -> dict:
        result = await self.db.execute(
            select(BatchRead).where(
                and_(BatchRead.id == batch_id, BatchRead.tenant_id == tenant_id)
            )
        )
        return _to_dict(result.scalar_one_or_none())

    async def get_students(self, tenant_id: str, batch_id: str) -> list:
        result = await self.db.execute(
            select(StudentRead)
            .join(BatchStudentRead, BatchStudentRead.student_id == StudentRead.id)
            .where(
                and_(
                    BatchStudentRead.batch_id == batch_id,
                    StudentRead.tenant_id == tenant_id,
                )
            )
        )
        return [_to_dict(s) for s in result.scalars().all()]

    async def get_attendance(self, tenant_id: str, batch_id: str) -> list:
        result = await self.db.execute(
            select(AttendanceRecordRead)
            .join(AttendanceSessionRead, AttendanceSessionRead.id == AttendanceRecordRead.session_id)
            .join(ClassRead, ClassRead.id == AttendanceSessionRead.class_id)
            .where(
                and_(
                    ClassRead.batch_id == batch_id,
                    AttendanceRecordRead.tenant_id == tenant_id,
                )
            )
        )
        return [_to_dict(r) for r in result.scalars().all()]

    async def get_exam_results(self, tenant_id: str, batch_id: str) -> list:
        # Exams are linked to batches directly via exams.batch_id (not exam_results),
        # so this requires an ExamRead model. Simplified: return exam results for
        # students enrolled in this batch.
        students = await self.get_students(tenant_id, batch_id)
        student_ids = [s["id"] for s in students]
        if not student_ids:
            return []
        result = await self.db.execute(
            select(ExamResultRead).where(
                and_(
                    ExamResultRead.student_id.in_(student_ids),
                    ExamResultRead.tenant_id == tenant_id,
                )
            )
        )
        return [_to_dict(r) for r in result.scalars().all()]

# # copilot_engine/repositories/batch_repository.py

# from sqlalchemy.ext.asyncio import AsyncSession

# from copilot_engine.services.backend_client import (
#     BackendClient,
# )

# from copilot_engine.schemas.request_context import (
#     RequestContext,
# )
# from copilot_engine.services.backend_client import (
#     BackendClient,
# )

# from copilot_engine.schemas.request_context import (
#     RequestContext,
# )


# class BatchRepository:
#     """
#     Repository responsible for batch-related data.

#     No analytics.
#     No report logic.
#     """

#     def __init__(self, db: AsyncSession):
#         self.db = db

#     async def get_batch(
#         self,
#         tenant_id: str,
#         batch_id: str,
#     ):
#         return await batch_service.get_batch(
#             self.db,
#             tenant_id,
#             batch_id,
#         )

#     async def get_batches(
#         self,
#         tenant_id: str,
#         page: int = 1,
#         limit: int = 20,
#         search: str | None = None,
#     ):
#         return await batch_service.get_batches(
#             self.db,
#             tenant_id,
#             page,
#             limit,
#             search,
#         )

#     async def get_batch_students(
#         self,
#         tenant_id: str,
#         batch_id: str,
#     ):
#         batch = await batch_service.get_batch(
#             self.db,
#             tenant_id,
#             batch_id,
#         )

#         return batch.student_ids

#     async def get_batch_classes(
#         self,
#         tenant_id: str,
#         batch_id: str,
#     ):
#         return await batch_service.get_classes(
#             self.db,
#             tenant_id,
#             batch_id,
#         )

#     async def get_batch_attendance(
#         self,
#         tenant_id: str,
#         batch_id: str,
#         from_date: str,
#         to_date: str,
#     ):
#         return await attendance_service.get_attendance_by_batch(
#             self.db,
#             tenant_id,
#             batch_id,
#             from_date,
#             to_date,
#         )