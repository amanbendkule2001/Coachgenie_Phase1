# copilot_engine/reports/builders/batch_performance_builder.py

from copilot_engine.reports.builders.base_report_builder import (
    BaseReportBuilder,
)


class BatchPerformanceReportBuilder(
    BaseReportBuilder
):

    TITLE = "Batch Performance Intelligence Report"

    REPORT_TYPE = "batch_performance"

    PROMPT_FILE = "batch_report.md"

    INPUT_KEY = "batch_data"