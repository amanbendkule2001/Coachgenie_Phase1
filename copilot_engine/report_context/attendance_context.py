from copilot_engine.repositories.attendance_repository import AttendanceRepository

from copilot_engine.analytics.attendance_metrics import AttendanceMetrics
from copilot_engine.analytics.risk_metrics import RiskMetrics

from copilot_engine.report_context.base_report_context import BaseReportContext


class AttendanceReportContext(BaseReportContext):

    REPORT_TYPE = "attendance"

    def __init__(self, db):

        self.db = db
        self.repository = AttendanceRepository(db)

    async def fetch_data(
        self,
        tenant_id: str,
        batch_id: str,
        from_date: str,
        to_date: str,
    ) -> dict:

        attendance = await self.repository.get_attendance(
            tenant_id,
            batch_id,
            from_date,
            to_date,
        )

        heatmap = await self.repository.get_heatmap(
            tenant_id,
        )

        return {

            "attendance": attendance,

            "heatmap": heatmap,

        }

    async def calculate_metrics(
        self,
        source_data: dict,
    ) -> dict:

        return {

            "attendance": AttendanceMetrics.batch_metrics(
                source_data["attendance"]
            ),

            "risk": RiskMetrics.attendance_risk(
                source_data["attendance"]
            ),

        }

    async def build_context(
        self,
        source_data: dict,
        metrics: dict,
    ) -> dict:

        return {

            "attendance_records": source_data["attendance"],

            "attendance_heatmap": source_data["heatmap"],

            "analytics": metrics,

        }