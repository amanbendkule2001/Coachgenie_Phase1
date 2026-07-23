from sqlalchemy.ext.asyncio import AsyncSession

from from copilot_engine.services.backend_client import (
    BackendClient,
)

from copilot_engine.schemas.request_context import (
    RequestContext,
)app.services import fee as fee_service


class FeeRepository:
    """
    Repository responsible for fee-related data.

    No revenue analytics.
    No risk calculations.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

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

    async def get_all_invoices(
        self,
        tenant_id: str,
    ):
        return await fee_service.get_all_invoices(
            self.db,
            tenant_id,
        )

    async def get_fee_summary(
        self,
        tenant_id: str,
    ):
        return await fee_service.get_revenue_summary(
            self.db,
            tenant_id,
        )

    async def get_monthly_collection(
        self,
        tenant_id: str,
    ):
        return await fee_service.get_monthly_collection(
            self.db,
            tenant_id,
        )

    async def get_payments(
        self,
        tenant_id: str,
        invoice_id: str,
    ):
        return await fee_service.get_payments(
            self.db,
            tenant_id,
            invoice_id,
        )

    async def get_fee_structures(
        self,
        tenant_id: str,
    ):
        return await fee_service.get_fee_structures(
            self.db,
            tenant_id,
        )