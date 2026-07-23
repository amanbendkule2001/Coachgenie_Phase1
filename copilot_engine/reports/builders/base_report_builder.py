from __future__ import annotations

import json
from abc import ABC
from datetime import datetime

from copilot_engine.core.logging_config import logging

from copilot_engine.llm.model_router import (
    ModelRouter,
)

from copilot_engine.parsers.report_response_parser import (
    ReportResponseParser,
)

from copilot_engine.reports.prompts.prompt_loader import (
    PromptLoader,
)

from copilot_engine.reports.schemas.report_schema import (
    ReportMetadata,
    ReportSchema,
)

logger = logging.getLogger(__name__)


class BaseReportBuilder(ABC):
    """
    Base class for all AI report builders.

    Responsibilities
    ----------------
    • Validate report context
    • Load prompt template
    • Inject context into prompt
    • Generate AI response
    • Parse AI response
    • Return ReportSchema
    """

    TITLE: str = ""
    REPORT_TYPE: str = ""

    # Markdown prompt filename
    PROMPT_FILE: str = ""

    # Variable name used inside prompt
    INPUT_KEY: str = ""

    GENERATED_BY = "Coach Genie AI"

    DEFAULT_TEMPERATURE = 0.2
    DEFAULT_MAX_TOKENS = 3000

    def __init__(self) -> None:

        self.provider = ModelRouter()

    # ==========================================================
    # PUBLIC
    # ==========================================================

    async def build(
        self,
        data: dict,
    ) -> ReportSchema:

        self._validate(data)

        prompt = self._build_prompt(data)

        logger.info(
            "Generating %s report...",
            self.REPORT_TYPE,
        )

        response = await self.provider.generate(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=self.DEFAULT_TEMPERATURE,
            max_tokens=self.DEFAULT_MAX_TOKENS,
        )

        logger.info(
            "%s report generated successfully.",
            self.REPORT_TYPE,
        )

        metadata = data.get(
            "report_metadata",
            ReportMetadata(
                generated_at=datetime.utcnow(),
                generated_by=self.GENERATED_BY,
                report_type=self.REPORT_TYPE,
            ),
        )

        return ReportResponseParser.parse(
            raw_response=response,
            metadata=metadata,
        )

    # ==========================================================
    # VALIDATION
    # ==========================================================

    def _validate(
        self,
        data: dict,
    ) -> None:

        if not data:
            raise ValueError(
                "Report context cannot be empty."
            )

    # ==========================================================
    # PROMPT
    # ==========================================================

    def _build_prompt(
        self,
        data: dict,
    ) -> str:

        formatted = json.dumps(
            data,
            indent=2,
            ensure_ascii=False,
            default=str,
        )

        return PromptLoader.load(
            prompt_file=self.PROMPT_FILE,
            variables={
                self.INPUT_KEY: formatted,
            },
        )