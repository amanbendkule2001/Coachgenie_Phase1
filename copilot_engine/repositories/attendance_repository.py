#  NEW CODE

# copilot_engine/repositories/attendance_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, inspect
from datetime import datetime

from copilot_engine.models.report_models import (
    AttendanceRecordRead,
    AttendanceSessionRead,
    ClassRead,
)


def _to_dict(obj) -> dict:
    if obj is None:
        return {}
    return {col.key: getattr(obj, col.key) for col in inspect(obj).mapper.column_attrs}


class AttendanceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_attendance(
        self, tenant_id: str, batch_id: str, from_date: str, to_date: str
    ) -> list:
        from_dt = datetime.fromisoformat(from_date).date()
        to_dt = datetime.fromisoformat(to_date).date()

        result = await self.db.execute(
            select(AttendanceRecordRead)
            .join(AttendanceSessionRead, AttendanceSessionRead.id == AttendanceRecordRead.session_id)
            .join(ClassRead, ClassRead.id == AttendanceSessionRead.class_id)
            .where(
                and_(
                    ClassRead.batch_id == batch_id,
                    AttendanceRecordRead.tenant_id == tenant_id,
                    AttendanceSessionRead.session_date >= from_dt,
                    AttendanceSessionRead.session_date <= to_dt,
                )
            )
        )
        return [_to_dict(r) for r in result.scalars().all()]

    async def get_heatmap(self, tenant_id: str) -> dict:
        # Placeholder — no heatmap query implemented yet.
        return {}

# # copilot_engine/repositories/attendance_repository.py

# from sqlalchemy.ext.asyncio import AsyncSession

# from copilot_engine.services.backend_client import (
#     BackendClient,
# )

# from copilot_engine.schemas.request_context import (
#     RequestContext,
# )


# class AttendanceRepository:
#     """
#     Repository responsible only for attendance data.

#     No calculations.
#     No percentages.
#     No analytics.
#     """

#     def __init__(self, db: AsyncSession):
#         self.db = db

#     async def get_student_summary(
#         self,
#         tenant_id: str,
#         student_id: str,
#     ):
#         return await attendance_service.get_student_summary(
#             self.db,
#             tenant_id,
#             student_id,
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

#     async def get_heatmap(
#         self,
#         tenant_id: str,
#     ):
#         return await attendance_service.get_heatmap(
#             self.db,
#             tenant_id,
#         )

#     async def get_sessions(
#         self,
#         tenant_id: str,
#         class_id: str,
#     ):
#         return await attendance_service.get_sessions(
#             self.db,
#             tenant_id,
#             class_id,
#         )