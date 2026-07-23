from __future__ import annotations

from pathlib import Path
from functools import lru_cache
from typing import Dict


class PromptLoader:
    """
    Centralized Prompt Loader.

    Loads and assembles markdown prompts
    for the LLM.
    """

    BASE_PATH = (
        Path(__file__)
        .resolve()
        .parent.parent
        / "prompts"
    )

    CORE_FILES = [

        "master/report_master.md",

        "analysis/report_analysis.md",

        "style/report_style.md",

        "guardrails/report_guardrails.md",

    ]

    # ==========================================================
    # PUBLIC
    # ==========================================================

    @classmethod
    def load(
        cls,
        prompt_file: str,
        variables: Dict[str, str] | None = None,
    ) -> str:

        prompt = cls._load_core()

        prompt += "\n\n"

        prompt += cls._read(
            f"reports/{prompt_file}"
        )

        if variables:

            prompt = cls._replace(
                prompt,
                variables,
            )

        return prompt

    # ==========================================================
    # CORE
    # ==========================================================

    @classmethod
    @lru_cache(maxsize=16)
    def _load_core(
        cls,
    ) -> str:

        sections = []

        for file in cls.CORE_FILES:

            sections.append(
                cls._read(file)
            )

        return "\n\n".join(sections)

    # ==========================================================
    # READ
    # ==========================================================

    @classmethod
    @lru_cache(maxsize=64)
    def _read(
        cls,
        relative_path: str,
    ) -> str:

        file_path = (
            cls.BASE_PATH
            / relative_path
        )

        if not file_path.exists():

            raise FileNotFoundError(
                f"Prompt file not found: {file_path}"
            )

        return file_path.read_text(
            encoding="utf-8"
        )

    # ==========================================================
    # VARIABLE REPLACEMENT
    # ==========================================================

    @staticmethod
    def _replace(
        prompt: str,
        variables: Dict[str, str],
    ) -> str:

        for key, value in variables.items():

            prompt = prompt.replace(
                "{{" + key + "}}",
                str(value),
            )

        return prompt