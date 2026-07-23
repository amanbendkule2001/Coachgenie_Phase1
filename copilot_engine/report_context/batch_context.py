from repositories.batch_repository import BatchRepository

from analytics.batch_metrics import BatchMetrics
from analytics.performance_metrics import PerformanceMetrics
from analytics.attendance_metrics import AttendanceMetrics

from report_context.base_report_context import BaseReportContext


class BatchReportContext(BaseReportContext):

    REPORT_TYPE = "batch"

    def __init__(self, db):

        self.db = db
        self.repository = BatchRepository(db)

    async def fetch_data(
        self,
        tenant_id: str,
        batch_id: str,
    ) -> dict:

        batch = await self.repository.get_batch(
            tenant_id,
            batch_id,
        )

        students = await self.repository.get_students(
            tenant_id,
            batch_id,
        )

        attendance = await self.repository.get_attendance(
            tenant_id,
            batch_id,
        )

        exams = await self.repository.get_exam_results(
            tenant_id,
            batch_id,
        )

        return {

            "batch": batch,

            "students": students,

            "attendance": attendance,

            "exams": exams,

        }

    async def calculate_metrics(
        self,
        source_data: dict,
    ) -> dict:

        return {

            "batch": BatchMetrics.batch_metrics(
                source_data
            ),

            "attendance": AttendanceMetrics.batch_metrics(
                source_data["attendance"]
            ),

            "performance": PerformanceMetrics.batch_metrics(
                source_data["exams"]
            ),

        }

    async def build_context(
        self,
        source_data: dict,
        metrics: dict,
    ) -> dict:

        return {

            "batch": source_data["batch"],

            "students": source_data["students"],

            "attendance": source_data["attendance"],

            "exam_results": source_data["exams"],

            "analytics": metrics,

        }