from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services import exam as exam_service


class ExamRepository:
    """
    Repository responsible for exam-related data.

    No analytics.
    No grading logic.
    No averages.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_exam(
        self,
        tenant_id: str,
        exam_id: str,
    ):
        return await exam_service.get_exam(
            self.db,
            tenant_id,
            exam_id,
        )

    async def get_exams(
        self,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        batch_id: str | None = None,
    ):
        return await exam_service.get_exams(
            self.db,
            tenant_id,
            page,
            limit,
            batch_id,
        )

    async def get_results(
        self,
        tenant_id: str,
        exam_id: str,
    ):
        return await exam_service.get_results(
            self.db,
            tenant_id,
            exam_id,
        )

    async def submit_results(
        self,
        tenant_id: str,
        exam_id: str,
        results: list,
    ):
        return await exam_service.submit_results(
            self.db,
            tenant_id,
            exam_id,
            results,
        )