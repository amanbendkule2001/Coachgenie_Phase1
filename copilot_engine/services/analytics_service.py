from __future__ import annotations

from typing import Any

from copilot_engine.analytics.attendance_metrics import AttendanceMetrics
from copilot_engine.analytics.performance_metrics import PerformanceMetrics
from copilot_engine.analytics.risk_metrics import RiskMetrics
from copilot_engine.analytics.batch_metrics import BatchMetrics
from copilot_engine.analytics.fee_metrics import FeeMetrics
from copilot_engine.analytics.admission_metrics import AdmissionMetrics


class AnalyticsService:
    """
    Central orchestration layer for analytics.

    Responsibilities
    ----------------
    • Coordinate metric calculations
    • Aggregate analytics
    • Expose reusable analytics APIs
    • Keep context builders lightweight
    """

    # ======================================================
    # STUDENT ANALYTICS
    # ======================================================

    @staticmethod
    async def build_student_analytics(
        *,
        student: dict,
        attendance: dict,
        exams: list,
        fees: list | None = None,
        growth_cards: list | None = None,
    ) -> dict:

        performance = await PerformanceMetrics.calculate(
            student=student,
            exams=exams,
        )

        attendance_metrics = await AttendanceMetrics.calculate_student(
            attendance=attendance,
        )

        risk = await RiskMetrics.calculate_student(
            performance=performance,
            attendance=attendance_metrics,
            fees=fees or [],
        )

        return {
            "performance": performance,
            "attendance": attendance_metrics,
            "risk": risk,
            "growth_cards": growth_cards or [],
        }

    # ======================================================
    # BATCH ANALYTICS
    # ======================================================

    @staticmethod
    async def build_batch_analytics(
        *,
        batch: dict,
        students: list,
        attendance: list,
        exams: list,
    ) -> dict:

        return {
            "performance": await BatchMetrics.performance(
                batch=batch,
                students=students,
                exams=exams,
            ),
            "attendance": await AttendanceMetrics.calculate_batch(
                attendance=attendance,
            ),
            "risk": await RiskMetrics.calculate_batch(
                students=students,
                attendance=attendance,
                exams=exams,
            ),
        }

    # ======================================================
    # ATTENDANCE ANALYTICS
    # ======================================================

    @staticmethod
    async def build_attendance_analytics(
        *,
        attendance: list,
    ) -> dict:

        return await AttendanceMetrics.full_report(
            attendance=attendance,
        )

    # ======================================================
    # ADMISSION ANALYTICS
    # ======================================================

    @staticmethod
    async def build_admission_analytics(
        *,
        admissions: list,
    ) -> dict:

        return await AdmissionMetrics.calculate(
            admissions=admissions,
        )

    # ======================================================
    # FEE ANALYTICS
    # ======================================================

    @staticmethod
    async def build_fee_analytics(
        *,
        invoices: list,
        payments: list,
    ) -> dict:

        return await FeeMetrics.calculate(
            invoices=invoices,
            payments=payments,
        )

    # ======================================================
    # ADMIN DASHBOARD
    # ======================================================

    @staticmethod
    async def build_dashboard_analytics(
        *,
        students: list,
        admissions: list,
        attendance: list,
        exams: list,
        invoices: list,
        payments: list,
    ) -> dict:

        return {
            "admissions": await AdmissionMetrics.calculate(
                admissions=admissions,
            ),
            "fees": await FeeMetrics.calculate(
                invoices=invoices,
                payments=payments,
            ),
            "attendance": await AttendanceMetrics.full_report(
                attendance=attendance,
            ),
            "performance": await PerformanceMetrics.dashboard(
                students=students,
                exams=exams,
            ),
            "risk": await RiskMetrics.dashboard(
                students=students,
                attendance=attendance,
                exams=exams,
                invoices=invoices,
            ),
        }