from __future__ import annotations


class PerformanceMetrics:
    """
    Academic Performance Analytics.

    Used in:

    • Student Reports
    • Batch Reports
    • AI Insights
    """

    @staticmethod
    def student_metrics(results: list) -> dict:

        if not results:
            return {}

        percentages = []

        grades = {}

        highest = None
        lowest = None

        for result in results:

            marks = float(result.marks_obtained)
            total = float(result.exam.total_marks)

            percentage = round(
                (marks / total) * 100,
                2,
            )

            percentages.append(
                percentage
            )

            grade = result.grade

            grades[grade] = grades.get(
                grade,
                0,
            ) + 1

            if highest is None or percentage > highest:

                highest = percentage

            if lowest is None or percentage < lowest:

                lowest = percentage

        average = round(
            sum(percentages) / len(percentages),
            2,
        )

        return {

            "average_percentage": average,

            "highest_percentage": highest,

            "lowest_percentage": lowest,

            "grade_distribution": grades,

            "total_exams": len(results),

        }

    @staticmethod
    def batch_metrics(results: list) -> dict:

        if not results:
            return {}

        percentages = []

        passed = 0

        failed = 0

        for result in results:

            percentage = round(
                (
                    float(result.marks_obtained)
                    /
                    float(result.exam.total_marks)
                )
                * 100,
                2,
            )

            percentages.append(
                percentage
            )

            if result.is_pass:

                passed += 1

            else:

                failed += 1

        average = round(
            sum(percentages) / len(percentages),
            2,
        )

        topper = max(
            percentages,
            default=0,
        )

        return {

            "batch_average": average,

            "highest_score": topper,

            "pass_count": passed,

            "fail_count": failed,

            "pass_percentage": round(
                (passed / len(results)) * 100,
                2,
            ) if results else 0,

        }