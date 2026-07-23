from sqlalchemy.ext.asyncio import AsyncSession

from copilot_engine.services.backend_client import (
    BackendClient,
)

from copilot_engine.schemas.request_context import (
    RequestContext,
)


class StudentRepository:
    """
    Repository responsible only for fetching student-related data.

    No business logic.
    No analytics.
    No calculations.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student(
        self,
        tenant_id: str,
        student_id: str,
    ):
        return await student_service.get_student(
            self.db,
            tenant_id,
            student_id,
        )

    async def get_students(
        self,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        search: str | None = None,
    ):
        return await student_service.get_students(
            self.db,
            tenant_id,
            page,
            limit,
            search,
        )

    async def get_exam_results(
        self,
        tenant_id: str,
        exam_id: str,
    ):
        return await exam_service.get_results(
            self.db,
            tenant_id,
            exam_id,
        )

    async def get_student_invoices(
        self,
        tenant_id: str,
        student_id: str,
    ):
        return await fee_service.get_student_invoices(
            self.db,
            tenant_id,
            student_id,
        )

    async def get_growth_cards(
        self,
        tenant_id: str,
        student_id: str,
    ):
        return await growth_service.get_student_growth_cards(
            self.db,
            tenant_id,
            student_id,
        )