from __future__ import annotations


class AttendanceMetrics:
    """
    Attendance analytics.

    Used by:

    • Student Report
    • Batch Report
    • Attendance Report
    • Risk Engine
    """

    @staticmethod
    def student_metrics(summary: dict) -> dict:
        """
        Accepts attendance summary returned by from copilot_engine.services.backend_client import (
    BackendClient,
)

from copilot_engine.schemas.request_context import (
    RequestContext,
)
        """

        if not summary:
            return {}

        return {

            "attendance_percentage": summary.get(
                "attendance_percent",
                0,
            ),

            "total_classes": summary.get(
                "total_classes",
                0,
            ),

            "present": summary.get(
                "present",
                0,
            ),

            "absent": summary.get(
                "absent",
                0,
            ),

            "late": summary.get(
                "late",
                0,
            ),

        }

    @staticmethod
    def batch_metrics(records: list[dict]) -> dict:

        if not records:
            return {}

        total = len(records)

        present = sum(
            1
            for r in records
            if r.get("status") == "present"
        )

        absent = sum(
            1
            for r in records
            if r.get("status") == "absent"
        )

        late = sum(
            1
            for r in records
            if r.get("status") == "late"
        )

        percentage = round(
            (present / total) * 100,
            2,
        ) if total else 0

        return {

            "attendance_percentage": percentage,

            "total_records": total,

            "present": present,

            "absent": absent,

            "late": late,

        }

    @staticmethod
    def attendance_trend(records: list[dict]) -> dict:

        if not records:
            return {}

        trend = {}

        for row in records:

            date = row.get("date")

            if date not in trend:

                trend[date] = {
                    "present": 0,
                    "absent": 0,
                    "late": 0,
                }

            trend[date][row["status"]] += 1

        return trend