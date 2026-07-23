from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class BaseReportContext(ABC):
    """
    Base class for all report context builders.

    Responsibilities
    ----------------
    • Validate source data
    • Build common metadata
    • Assemble report context
    • Provide helper utilities

    Child classes only implement
    data gathering and metrics.
    """

    REPORT_TYPE: str = ""

    # ==========================================================
    # PUBLIC API
    # ==========================================================

    async def build(self, *args, **kwargs) -> dict:
        """
        Main entry point.

        Child classes inherit this workflow.
        """

        source_data = await self.fetch_data(
            *args,
            **kwargs,
        )

        self.validate(source_data)

        metrics = await self.calculate_metrics(
            source_data
        )

        context = await self.build_context(
            source_data,
            metrics,
        )

        context["report_metadata"] = (
            self.build_metadata()
        )

        return context

    # ==========================================================
    # ABSTRACT METHODS
    # ==========================================================

    @abstractmethod
    async def fetch_data(
        self,
        *args,
        **kwargs,
    ) -> dict:
        """
        Fetch data from services.
        """

    @abstractmethod
    async def calculate_metrics(
        self,
        source_data: dict,
    ) -> dict:
        """
        Compute analytics.
        """

    @abstractmethod
    async def build_context(
        self,
        source_data: dict,
        metrics: dict,
    ) -> dict:
        """
        Build final report context.
        """

    # ==========================================================
    # COMMON UTILITIES
    # ==========================================================

    def validate(
        self,
        source_data: dict,
    ) -> None:

        if not source_data:

            raise ValueError(
                "Report source data cannot be empty."
            )

    def build_metadata(
        self,
    ) -> dict:

        return {

            "generated_at": (
                datetime.utcnow().isoformat()
            ),

            "report_type": self.REPORT_TYPE,

            "generator": "Coach Genie AI",

            "version": "1.0",

        }

    # ==========================================================
    # HELPERS
    # ==========================================================

    @staticmethod
    def safe_percentage(
        numerator: int | float,
        denominator: int | float,
    ) -> float:

        if denominator == 0:

            return 0.0

        return round(
            (numerator / denominator) * 100,
            2,
        )

    @staticmethod
    def safe_average(
        values: list[int | float],
    ) -> float:

        if not values:

            return 0.0

        return round(
            sum(values) / len(values),
            2,
        )

    @staticmethod
    def safe_division(
        numerator: float,
        denominator: float,
    ) -> float:

        if denominator == 0:

            return 0.0

        return round(
            numerator / denominator,
            2,
        )