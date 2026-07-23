from __future__ import annotations


class BatchMetrics:
    """
    Batch Analytics.

    Used by:

    • Batch Reports
    • Admin Dashboard
    • Analytics Agent
    """

    @staticmethod
    def batch_metrics(
        source_data: dict,
    ) -> dict:

        students = source_data.get(
            "students",
            []
        )

        attendance = source_data.get(
            "attendance",
            []
        )

        exams = source_data.get(
            "exams",
            []
        )

        total_students = len(
            students
        )

        active_students = sum(
            1
            for student in students
            if getattr(
                student,
                "is_active",
                True,
            )
        )

        inactive_students = (
            total_students
            -
            active_students
        )

        attendance_percentage = 0

        if attendance:

            present = sum(
                1
                for row in attendance
                if row.get("status") == "present"
            )

            attendance_percentage = round(
                (present / len(attendance)) * 100,
                2,
            )

        average_marks = 0

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

            average_marks = round(
                sum(percentages)
                /
                len(percentages),
                2,
            )

        return {

            "total_students": total_students,

            "active_students": active_students,

            "inactive_students": inactive_students,

            "attendance_percentage": attendance_percentage,

            "average_marks": average_marks,

        }

    @staticmethod
    def subject_distribution(
        students: list,
    ) -> dict:

        distribution = {}

        for student in students:

            for subject in getattr(
                student,
                "subjects",
                [],
            ):

                distribution[subject] = (
                    distribution.get(
                        subject,
                        0,
                    )
                    + 1
                )

        return distribution

    @staticmethod
    def enrollment_summary(
        students: list,
    ) -> dict:

        return {

            "total_enrollments": len(
                students
            ),

            "active": sum(
                1
                for s in students
                if getattr(
                    s,
                    "is_active",
                    True,
                )
            ),

            "inactive": sum(
                1
                for s in students
                if not getattr(
                    s,
                    "is_active",
                    True,
                )
            ),

        }