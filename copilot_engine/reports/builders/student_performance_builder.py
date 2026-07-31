# copilot_engine/reports/builders/student_performance_builder.py

from copilot_engine.reports.builders.base_report_builder import (
    BaseReportBuilder,
)


class StudentPerformanceReportBuilder(
    BaseReportBuilder
):

    TITLE = "Student Performance Intelligence Report"

    REPORT_TYPE = "student_performance"

    PROMPT_FILE = "student_report.md"

    INPUT_KEY = "student_data"