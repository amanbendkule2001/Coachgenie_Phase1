from __future__ import annotations

from collections import Counter


class AdmissionMetrics:
    """
    Admission Analytics.

    Used by:

    • Admission Reports
    • Admin Dashboard
    • Analytics Agent
    """

    @staticmethod
    def calculate(
        admissions: list,
    ) -> dict:

        if not admissions:

            return {}

        status_counter = Counter()

        course_counter = Counter()

        monthly_counter = Counter()

        for admission in admissions:

            status_counter[
                getattr(
                    admission,
                    "status",
                    "UNKNOWN",
                )
            ] += 1

            course = (
                getattr(
                    admission,
                    "applied_course",
                    None,
                )
                or "Unknown"
            )

            course_counter[
                course
            ] += 1

            created = getattr(
                admission,
                "created_at",
                None,
            )

            if created:

                monthly_counter[
                    created.strftime("%Y-%m")
                ] += 1

        total = len(
            admissions
        )

        confirmed = status_counter.get(
            "CONFIRMED",
            0,
        )

        rejected = status_counter.get(
            "REJECTED",
            0,
        )

        pending = (
            total
            -
            confirmed
            -
            rejected
        )

        return {

            "total_admissions": total,

            "confirmed": confirmed,

            "pending": pending,

            "rejected": rejected,

            "conversion_rate": round(
                (confirmed / total) * 100,
                2,
            ) if total else 0,

            "status_distribution": dict(
                status_counter
            ),

            "course_distribution": dict(
                course_counter
            ),

            "monthly_trend": dict(
                monthly_counter
            ),

        }

    @staticmethod
    def yearly_summary(
        admissions: list,
    ) -> dict:

        years = Counter()

        for admission in admissions:

            if getattr(
                admission,
                "created_at",
                None,
            ):

                years[
                    admission.created_at.year
                ] += 1

        return dict(
            years
        )