from repositories.admission_repository import AdmissionRepository

from analytics.admission_metrics import AdmissionMetrics

from report_context.base_report_context import BaseReportContext


class AdmissionReportContext(BaseReportContext):

    REPORT_TYPE = "admission"

    def __init__(self, db):

        self.db = db
        self.repository = AdmissionRepository(db)

    async def fetch_data(
        self,
        tenant_id: str,
    ) -> dict:

        admissions = await self.repository.get_admissions(
            tenant_id,
        )

        return {

            "admissions": admissions,

        }

    async def calculate_metrics(
        self,
        source_data: dict,
    ) -> dict:

        return {

            "admissions": AdmissionMetrics.calculate(
                source_data["admissions"]
            )

        }

    async def build_context(
        self,
        source_data: dict,
        metrics: dict,
    ) -> dict:

        return {

            "admissions": source_data["admissions"],

            "analytics": metrics,

        }