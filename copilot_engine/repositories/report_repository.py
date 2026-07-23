# # ai/repositories/report_repository.py

# import logging

# from uuid import UUID
# from typing import (
#     Optional,
#     List,
# )

# from sqlalchemy import (
#     select,
#     desc,
# )

# from sqlalchemy.ext.asyncio import (
#     AsyncSession,
# )

# from sqlalchemy.exc import (
#     SQLAlchemyError,
# )

# from copilot_engine.schemas.models.ai_generated_reports import (
#     AIGeneratedReport,
# )

# from copilot_engine.core.exception import (
#     DatabaseOperationError,
# )

# logger = logging.getLogger(
#     __name__
# )


# class ReportRepository:

#     def __init__(
#         self,
#         db: AsyncSession,
#     ):

#         self.db = db

#     # =====================================================
#     # CREATE REPORT
#     # =====================================================

#     async def create_report(
#         self,
#         *,
#         student_id: UUID,
#         report_type: str,
#         generated_by: UUID,
#         summary: str,
#         report_json: dict,
#     ) -> AIGeneratedReport:

#         logger.info(
#             "Creating AI generated report",
#             extra={
#                 "student_id": str(student_id),
#                 "report_type": report_type,
#             },
#         )

#         try:

#             report = AIGeneratedReport(
#                 student_id=student_id,
#                 report_type=report_type,
#                 generated_by=generated_by,
#                 summary=summary,
#                 report_json=report_json,
#             )

#             self.db.add(report)

#             await self.db.flush()

#             await self.db.refresh(report)

#             logger.info(
#                 "AI report created successfully",
#                 extra={
#                     "report_id": str(report.id),
#                 },
#             )

#             return report

#         except SQLAlchemyError as error:

#             logger.exception(
#                 "Failed to create AI report"
#             )

#             raise DatabaseOperationError(
#                 message="Failed to create report",
#                 metadata={
#                     "error": str(error),
#                 },
#             ) from error

#     # =====================================================
#     # GET REPORT BY ID
#     # =====================================================

#     async def get_report_by_id(
#         self,
#         report_id: UUID,
#     ) -> Optional[AIGeneratedReport]:

#         try:

#             query = (
#                 select(AIGeneratedReport)
#                 .where(
#                     AIGeneratedReport.id
#                     == report_id
#                 )
#             )

#             result = await self.db.execute(
#                 query
#             )

#             return result.scalar_one_or_none()

#         except SQLAlchemyError as error:

#             logger.exception(
#                 "Failed to fetch report"
#             )

#             raise DatabaseOperationError(
#                 message="Failed to fetch report",
#                 metadata={
#                     "report_id": str(report_id),
#                     "error": str(error),
#                 },
#             ) from error

#     # =====================================================
#     # GET STUDENT REPORTS
#     # =====================================================

#     async def get_student_reports(
#         self,
#         student_id: UUID,
#         limit: int = 20,
#     ) -> List[AIGeneratedReport]:

#         try:

#             query = (
#                 select(AIGeneratedReport)
#                 .where(
#                     AIGeneratedReport.student_id
#                     == student_id
#                 )
#                 .order_by(
#                     desc(
#                         AIGeneratedReport.created_at
#                     )
#                 )
#                 .limit(limit)
#             )

#             result = await self.db.execute(
#                 query
#             )

#             return list(
#                 result.scalars().all()
#             )

#         except SQLAlchemyError as error:

#             logger.exception(
#                 "Failed to fetch student reports"
#             )

#             raise DatabaseOperationError(
#                 message="Failed to fetch reports",
#                 metadata={
#                     "student_id": str(student_id),
#                     "error": str(error),
#                 },
#             ) from error

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from copilot_engine.schemas.models.ai_generated_reports import (
    AIGeneratedReport,
)


class ReportRepository:
    """
    Repository responsible for storing and retrieving
    AI generated reports.

    No report generation.
    No LLM calls.
    No formatting.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------------------------------------------------------
    # Create
    # ---------------------------------------------------------

    async def save_report(
        self,
        report: AIGeneratedReport,
    ) -> AIGeneratedReport:

        self.db.add(report)
        await self.db.flush()
        await self.db.refresh(report)

        return report

    # ---------------------------------------------------------
    # Read
    # ---------------------------------------------------------

    async def get_report(
        self,
        tenant_id: str,
        report_id: str,
    ):

        result = await self.db.execute(
            select(AIGeneratedReport).where(
                and_(
                    AIGeneratedReport.id == report_id,
                    AIGeneratedReport.tenant_id == tenant_id,
                )
            )
        )

        return result.scalar_one_or_none()

    async def get_reports(
        self,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
    ):

        total = (
            await self.db.execute(
                select(func.count())
                .select_from(AIGeneratedReport)
                .where(
                    AIGeneratedReport.tenant_id == tenant_id
                )
            )
        ).scalar()

        result = await self.db.execute(
            select(AIGeneratedReport)
            .where(
                AIGeneratedReport.tenant_id == tenant_id
            )
            .order_by(
                AIGeneratedReport.created_at.desc()
            )
            .offset((page - 1) * limit)
            .limit(limit)
        )

        return {
            "items": result.scalars().all(),
            "total": total,
            "page": page,
            "limit": limit,
        }

    async def get_student_reports(
        self,
        tenant_id: str,
        student_id: str,
    ):

        result = await self.db.execute(
            select(AIGeneratedReport)
            .where(
                and_(
                    AIGeneratedReport.tenant_id == tenant_id,
                    AIGeneratedReport.student_id == student_id,
                )
            )
            .order_by(
                AIGeneratedReport.created_at.desc()
            )
        )

        return result.scalars().all()

    async def get_batch_reports(
        self,
        tenant_id: str,
        batch_id: str,
    ):

        result = await self.db.execute(
            select(AIGeneratedReport)
            .where(
                and_(
                    AIGeneratedReport.tenant_id == tenant_id,
                    AIGeneratedReport.batch_id == batch_id,
                )
            )
            .order_by(
                AIGeneratedReport.created_at.desc()
            )
        )

        return result.scalars().all()

    # ---------------------------------------------------------
    # Update
    # ---------------------------------------------------------

    async def update_report(
        self,
        report: AIGeneratedReport,
        **fields,
    ) -> AIGeneratedReport:

        for key, value in fields.items():
            setattr(report, key, value)

        await self.db.flush()
        await self.db.refresh(report)

        return report

    # ---------------------------------------------------------
    # Delete
    # ---------------------------------------------------------

    async def delete_report(
        self,
        report: AIGeneratedReport,
    ):

        await self.db.delete(report)
        await self.db.flush()

        return True