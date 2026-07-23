# copilot_engine/reports/builders/attendance_report_builder.py 

from copilot_engine.reports.builders.base_report_builder import (
    BaseReportBuilder,
)


class AttendanceReportBuilder(
    BaseReportBuilder
):

    TITLE = "Attendance & Engagement Intelligence Report"

    REPORT_TYPE = "attendance_report"

    PROMPT_FILE = "attendance_report.md"

    INPUT_KEY = "attendance_data"