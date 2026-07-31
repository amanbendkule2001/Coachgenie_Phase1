from __future__ import annotations

import re
from typing import List

from copilot_engine.reports.schemas.report_schema import (
    ReportMetadata,
    ReportSchema,
    ReportSection,
)


class ReportResponseParser:
    """
    Parses raw LLM report output into
    ReportSchema.

    Expected format:

    # Title

    ## Executive Summary

    ....

    ## Attendance

    ...

    ## Recommendations

    ...
    """

    @classmethod
    def parse(
        cls,
        raw_response: str,
        metadata: ReportMetadata,
    ) -> ReportSchema:

        title = cls._extract_title(raw_response)

        summary = cls._extract_summary(raw_response)

        sections = cls._extract_sections(raw_response)

        return ReportSchema(
            title=title,
            summary=summary,
            metadata=metadata,
            sections=sections,
        )

    # ======================================================
    # TITLE
    # ======================================================

    @staticmethod
    def _extract_title(
        text: str,
    ) -> str:

        match = re.search(
            r"^#\s+(.*)",
            text,
            flags=re.MULTILINE,
        )

        if match:
            return match.group(1).strip()

        return "AI Report"

    # ======================================================
    # SUMMARY
    # ======================================================

    @staticmethod
    def _extract_summary(
        text: str,
    ) -> str | None:

        pattern = (
            r"##\s*Executive Summary(.*?)"
            r"(?=\n##|\Z)"
        )

        match = re.search(
            pattern,
            text,
            flags=re.DOTALL | re.IGNORECASE,
        )

        if match:
            return match.group(1).strip()

        return None

    # ======================================================
    # SECTIONS
    # ======================================================

    @classmethod
    def _extract_sections(
        cls,
        text: str,
    ) -> List[ReportSection]:

        pattern = (
            r"##\s+(.*?)\n"
            r"(.*?)(?=\n##|\Z)"
        )

        matches = re.findall(
            pattern,
            text,
            flags=re.DOTALL,
        )

        if not matches:

            return [
                ReportSection(
                    title="Report",
                    content=text.strip(),
                )
            ]

        sections = []

        for title, body in matches:

            sections.append(
                ReportSection(
                    title=title.strip(),
                    content=body.strip(),
                )
            )

        return sections