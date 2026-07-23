from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services import batch as batch_service
from backend.app.services import attendance as attendance_service


class BatchRepository:
    """
    Repository responsible for batch-related data.

    No analytics.
    No report logic.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_batch(
        self,
        tenant_id: str,
        batch_id: str,
    ):
        return await batch_service.get_batch(
            self.db,
            tenant_id,
            batch_id,
        )

    async def get_batches(
        self,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        search: str | None = None,
    ):
        return await batch_service.get_batches(
            self.db,
            tenant_id,
            page,
            limit,
            search,
        )

    async def get_batch_students(
        self,
        tenant_id: str,
        batch_id: str,
    ):
        batch = await batch_service.get_batch(
            self.db,
            tenant_id,
            batch_id,
        )

        return batch.student_ids

    async def get_batch_classes(
        self,
        tenant_id: str,
        batch_id: str,
    ):
        return await batch_service.get_classes(
            self.db,
            tenant_id,
            batch_id,
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