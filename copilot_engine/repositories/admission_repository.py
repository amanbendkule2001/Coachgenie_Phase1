from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services import admission as admission_service


class AdmissionRepository:
    """
    Repository responsible for admission-related data.

    Only data access.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_admission(
        self,
        tenant_id: str,
        admission_id: str,
    ):
        return await admission_service.get_admission(
            self.db,
            tenant_id,
            admission_id,
        )

    async def get_admissions(
        self,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        status: str | None = None,
    ):
        return await admission_service.get_admissions(
            self.db,
            tenant_id,
            page,
            limit,
            status,
        )

    async def create_admission(
        self,
        tenant_id: str,
        data: dict,
    ):
        return await admission_service.create_admission(
            self.db,
            tenant_id,
            data,
        )

    async def approve_admission(
        self,
        tenant_id: str,
        admission_id: str,
        approved_by: str,
    ):
        return await admission_service.approve_admission(
            self.db,
            tenant_id,
            admission_id,
            approved_by,
        )

    async def reject_admission(
        self,
        tenant_id: str,
        admission_id: str,
        updated_by: str,
        reason: str | None = None,
    ):
        return await admission_service.reject_admission(
            self.db,
            tenant_id,
            admission_id,
            updated_by,
            reason,
        )

    async def convert_lead(
        self,
        tenant_id: str,
        lead_id: str,
        converted_by: str,
        admission_data: dict | None = None,
    ):
        return await admission_service.convert_lead(
            self.db,
            tenant_id,
            lead_id,
            converted_by,
            admission_data,
        )