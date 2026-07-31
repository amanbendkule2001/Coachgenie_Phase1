from __future__ import annotations


class RiskMetrics:
    """
    Student Risk Analytics.

    Used by:

    • Student Reports
    • Analytics Agent
    • Growth Cards
    • Risk Detection Workflow
    """

    @staticmethod
    def student_risk(
        attendance: dict,
        exams: list,
        fees: dict,
    ) -> dict:

        score = 0
        reasons = []

        attendance_pct = attendance.get(
            "attendance_percent",
            100,
        )

        if attendance_pct < 75:

            score += 40

            reasons.append(
                "Low attendance"
            )

        if exams:

            percentages = []

            for result in exams:

                percentage = (
                    float(result.marks_obtained)
                    /
                    float(result.exam.total_marks)
                ) * 100

                percentages.append(
                    percentage
                )

            avg = sum(percentages) / len(percentages)

            if avg < 50:

                score += 40

                reasons.append(
                    "Poor academic performance"
                )

        if fees:

            outstanding = fees.get(
                "total_outstanding",
                0,
            )

            if outstanding > 0:

                score += 20

                reasons.append(
                    "Pending fee payments"
                )

        if score >= 70:

            level = "High"

        elif score >= 40:

            level = "Medium"

        else:

            level = "Low"

        return {

            "risk_score": score,

            "risk_level": level,

            "risk_reasons": reasons,

        }

    @staticmethod
    def attendance_risk(
        attendance_records: list,
    ) -> dict:

        if not attendance_records:

            return {}

        total = len(attendance_records)

        absent = sum(
            1
            for row in attendance_records
            if row.get("status") == "absent"
        )

        late = sum(
            1
            for row in attendance_records
            if row.get("status") == "late"
        )

        absence_rate = round(
            (absent / total) * 100,
            2,
        )

        return {

            "absence_rate": absence_rate,

            "late_count": late,

            "high_risk": absence_rate > 25,

        }

    @staticmethod
    def batch_risk(
        students: list,
    ) -> dict:

        if not students:

            return {}

        high = 0
        medium = 0
        low = 0

        for student in students:

            score = student.get(
                "risk_score",
                0,
            )

            if score >= 70:

                high += 1

            elif score >= 40:

                medium += 1

            else:

                low += 1

        return {

            "high_risk_students": high,

            "medium_risk_students": medium,

            "low_risk_students": low,

        }