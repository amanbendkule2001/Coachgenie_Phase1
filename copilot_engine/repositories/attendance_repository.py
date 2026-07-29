# copilot_engine/repositories/attendance_repository.py

from sqlalchemy.ext.asyncio import AsyncSession

from copilot_engine.services.backend_client import (
    BackendClient,
)

from copilot_engine.schemas.request_context import (
    RequestContext,
)


class AttendanceRepository:
    """
    Repository responsible only for attendance data.

    No calculations.
    No percentages.
    No analytics.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student_summary(
        self,
        tenant_id: str,
        student_id: str,
    ):
        return await attendance_service.get_student_summary(
            self.db,
            tenant_id,
            student_id,
        )

    async def get_batch_attendance(
        self,
        tenant_id: str,
        batch_id: str,
        from_date: str,
        to_date: str,
    ):
        return await attendance_service.get_attendance_by_batch(
            self.db,
            tenant_id,
            batch_id,
            from_date,
            to_date,
        )

    async def get_heatmap(
        self,
        tenant_id: str,
    ):
        return await attendance_service.get_heatmap(
            self.db,
            tenant_id,
        )

    async def get_sessions(
        self,
        tenant_id: str,
        class_id: str,
    ):
        return await attendance_service.get_sessions(
            self.db,
            tenant_id,
            class_id,
        )