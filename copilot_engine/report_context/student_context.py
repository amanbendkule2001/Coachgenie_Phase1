from copilot_engine.repositories.student_repository import StudentRepository
from copilot_engine.analytics.performance_metrics import PerformanceMetrics
from copilot_engine.analytics.attendance_metrics import AttendanceMetrics
from copilot_engine.analytics.risk_metrics import RiskMetrics

from copilot_engine.report_context.base_report_context import BaseReportContext


class StudentReportContext(BaseReportContext):

    REPORT_TYPE = "student"

    def __init__(self, db):
        self.db = db
        self.repository = StudentRepository(db)

    async def fetch_data(
        self,
        tenant_id: str,
        student_id: str,
    ) -> dict:

        student = await self.repository.get_student(
            tenant_id,
            student_id,
        )

        attendance = await self.repository.get_attendance_summary(
            tenant_id,
            student_id,
        )

        exams = await self.repository.get_exam_results(
            tenant_id,
            student_id,
        )

        fees = await self.repository.get_fee_summary(
            tenant_id,
            student_id,
        )

        growth_cards = await self.repository.get_growth_cards(
            tenant_id,
            student_id,
        )

        return {
            "student": student,
            "attendance": attendance,
            "exams": exams,
            "fees": fees,
            "growth_cards": growth_cards,
        }

    async def calculate_metrics(
        self,
        source_data: dict,
    ) -> dict:

        return {

            "performance": PerformanceMetrics.student_metrics(
                source_data["exams"]
            ),

            "attendance": AttendanceMetrics.student_metrics(
                source_data["attendance"]
            ),

            "risk": RiskMetrics.student_risk(
                attendance=source_data["attendance"],
                exams=source_data["exams"],
                fees=source_data["fees"],
            ),

        }

    async def build_context(
        self,
        source_data: dict,
        metrics: dict,
    ) -> dict:

        return {

            "student": source_data["student"],

            "attendance": source_data["attendance"],

            "exam_results": source_data["exams"],

            "fee_summary": source_data["fees"],

            "growth_cards": source_data["growth_cards"],

            "analytics": metrics,

        }