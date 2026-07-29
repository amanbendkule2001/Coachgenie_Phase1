# NEW CODE

# copilot_engine/routes/report_routes.py

from __future__ import annotations

import logging
import os

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from fastapi.responses import FileResponse

from sqlalchemy.ext.asyncio import AsyncSession

# ============================================
# Backend Dependencies
# ============================================

from copilot_engine.database.database import (
    get_db,
)

from copilot_engine.dependencies.dependencies import (
    get_tenant_id,
    get_user_id,
)

# ============================================
# Report Service
# ============================================

from copilot_engine.reports.services.report_service import (
    ReportService,
)

# ============================================
# Request Schemas
# ============================================

from copilot_engine.schemas.report_requests import (
    StudentReportRequest,
    BatchReportRequest,
    AttendanceReportRequest,
    AdmissionReportRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)

@router.post("/student-performance")
async def generate_student_report(

    payload: StudentReportRequest,

    db: AsyncSession = Depends(get_db),

    tenant = Depends(get_tenant_id),

):

    try:

        pdf_path = await ReportService.generate_student_report(

            db=db,

            tenant_id=str(tenant),

            student_id=payload.student_id,

        )

        print(">>> NEW REPORT SERVICE <<<")
        print(f"student_id={payload.student_id}")
        return FileResponse(

            path=pdf_path,

            media_type="application/pdf",

            filename=os.path.basename(pdf_path),

        )

    except Exception as exc:

        logger.exception("Student report generation failed")

        raise HTTPException(

            status_code=500,

            detail=str(exc),

        )
        
@router.post("/batch-performance")
async def generate_batch_report(

    payload: BatchReportRequest,

    db: AsyncSession = Depends(get_db),

    tenant = Depends(get_tenant_id),

):

    try:

        pdf_path = await ReportService.generate_batch_report(

            db=db,

            tenant_id=str(tenant),

            batch_id=payload.batch_id,

        )

        return FileResponse(

            path=pdf_path,

            media_type="application/pdf",

            filename=os.path.basename(pdf_path),

        )

    except Exception as exc:

        logger.exception("Batch report generation failed")

        raise HTTPException(

            status_code=500,

            detail=str(exc),

        )
        

@router.post("/attendance-report")
async def generate_attendance_report(
    payload: AttendanceReportRequest,
    db: AsyncSession = Depends(get_db),
    tenant = Depends(get_tenant_id),
):
    try:
        to_date = payload.to_date or date.today().isoformat()
        from_date = payload.from_date or (date.today() - timedelta(days=30)).isoformat()

        pdf_path = await ReportService.generate_attendance_report(
            db=db,
            tenant_id=str(tenant),
            batch_id=payload.batch_id,
            from_date=from_date,
            to_date=to_date,
        )

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=os.path.basename(pdf_path),
        )

    except Exception as exc:
        logger.exception("Attendance report generation failed")
        raise HTTPException(status_code=500, detail=str(exc))
    
@classmethod
async def generate_attendance_report(
    cls,
    *,
    db: AsyncSession,
    tenant_id: str,
    batch_id: str,
    from_date: str,
    to_date: str,
    filename: Optional[str] = None,
) -> str:
    return await cls._generate(
        context_builder=AttendanceReportContext(db=db),
        builder=AttendanceReportBuilder(),
        filename=filename,
        context_kwargs={
            "tenant_id": tenant_id,
            "batch_id": batch_id,
            "from_date": from_date,
            "to_date": to_date,
        },
    )    
        
@router.post("/admission-report")
async def generate_admission_report(

    payload: AdmissionReportRequest,

    db: AsyncSession = Depends(get_db),

    tenant = Depends(get_tenant_id),

):

    try:

        pdf_path = await ReportService.generate_admission_report(

            db=db,

            tenant_id=str(tenant),

        )

        return FileResponse(

            path=pdf_path,

            media_type="application/pdf",

            filename=os.path.basename(pdf_path),

        )

    except Exception as exc:

        logger.exception("Admission report generation failed")

        raise HTTPException(

            status_code=500,

            detail=str(exc),

        )

# import logging

# from pathlib import Path

# from pydantic import BaseModel

# from fastapi import (
#     APIRouter,
#     HTTPException,
# )

# from fastapi.responses import (
#     FileResponse,
# )

# from copilot_engine.reports.schemas.report_schema import (
#     ReportSchema,
# )

# from copilot_engine.reports.services.report_service import (
#     ReportService,
# )
# import os

# logger = logging.getLogger(__name__)

# router = APIRouter(
#     prefix="/reports",
#     tags=["Reports"],
# )

# class StudentReportRequest(BaseModel):
#     student_id: str


# class AttendanceReportRequest(BaseModel):
#     attendance_data: dict


# class BatchReportRequest(BaseModel):
#     batch_data: dict
# # =========================================================
# # GENERATE PDF REPORT
# # =========================================================

# @router.post("/generate-pdf")
# async def generate_pdf_report(
#     report: ReportSchema,
# ):

#     """
#     Generate downloadable PDF report.
#     """

#     try:

#         logger.info(
#             "Received PDF report request",
#             extra={
#                 "report_title": (
#                     report.title
#                 ),
#                 "report_type": (
#                     report.metadata.report_type
#                 ),
#             },
#         )

#         # =============================================
#         # GENERATE PDF
#         # =============================================

#         pdf_file_path = (

#             ReportService
#             .generate_pdf_report(
#                 report=report,
#             )

#         )

#         file_path = Path(
#             pdf_file_path
#         )

#         # =============================================
#         # VALIDATE FILE
#         # =============================================

#         if not file_path.exists():

#             raise HTTPException(
#                 status_code=500,
#                 detail=(
#                     "Generated PDF file "
#                     "does not exist."
#                 ),
#             )

#         logger.info(
#             "Returning generated PDF",
#             extra={
#                 "file_path": str(
#                     file_path
#                 ),
#             },
#         )

#         # =============================================
#         # DOWNLOAD RESPONSE
#         # =============================================

#         return {
#             "success": True,
#             "report_url": pdf_file_path,
#         }

#     except HTTPException:

#         raise

#     except Exception:

#         logger.exception(
#             "Failed to generate PDF report"
#         )

#         raise HTTPException(
#             status_code=500,
#             detail=(
#                 "Failed to generate "
#                 "PDF report."
#             ),
#         )
        
# # @router.post("/student-performance")
# # async def generate_student_performance_report(
# #     payload: StudentReportRequest,
# # ):

# #     pdf_path = await ReportService.generate_student_report(
# #         student_data=payload.student_data,
# #     )

# #     return {
# #         "success": True,
# #         "pdf_url": pdf_path,
# #     }
    
# # @router.post("/student-performance")
# # async def generate_student_performance_report(
# #     payload: StudentReportRequest,
# # ):

# #     try:

# #         logger.info(
# #             f"Incoming payload: {payload.dict()}"
# #         )

# #         logger.info(
# #             f"Student data: {payload.student_data}"
# #         )

# #         if not payload.student_data:

# #             raise HTTPException(
# #                 status_code=400,
# #                 detail="student_data is empty",
# #             )

# #         pdf_path = await ReportService.generate_student_report(
# #             student_data=payload.student_data,
# #         )

# #         return {
# #             "success": True,
# #             "pdf_url": pdf_path,
# #         }

# #     except Exception as e:

# #         logger.exception(
# #             "Student report generation failed"
# #         )

# #         raise HTTPException(
# #             status_code=500,
# #             detail=str(e),
# #         )

# # @router.post("/student-performance")
# # async def generate_student_performance_report(
# #     payload: StudentReportRequest,
# # ):

# #     try:

# #         logger.info(
# #             f"FULL PAYLOAD: {payload.dict()}"
# #         )

# #         if not payload.student_data:

# #             raise HTTPException(
# #                 status_code=400,
# #                 detail="student_data is empty",
# #             )

# #         pdf_path = await ReportService.generate_student_report(
# #             student_data=payload.student_data,
# #         )

# #         logger.info(
# #             f"Generated PDF: {pdf_path}"
# #         )

# #         return {
# #             "success": True,
# #             "pdf_url": pdf_path,
# #         }

# #     except Exception as e:

# #         logger.exception(
# #             "REPORT GENERATION FAILED"
# #         )

# #         raise HTTPException(
# #             status_code=500,
# #             detail=str(e),
# #         )

# # @router.post("/attendance-report")
# # async def generate_attendance_report(
# #     payload: AttendanceReportRequest,
# # ):

# #     pdf_path = await ReportService.generate_attendance_report(
# #         attendance_data=payload.attendance_data,
# #     )

# #     return {
# #         "success": True,
# #         "pdf_url": pdf_path,
# #     }
    
# # @router.post("/batch-performance")
# # async def generate_batch_performance_report(
# #     payload: BatchReportRequest,
# # ):

# #     pdf_path = await ReportService.generate_batch_report(
# #         batch_data=payload.batch_data,
# #     )

# #     return {
# #         "success": True,
# #         "pdf_url": pdf_path,
# #     }


# @router.post("/student-performance")
# async def generate_student_performance_report(
#     payload: StudentReportRequest,
# ):

#     try:

#         logger.info(
#             f"FULL PAYLOAD: {payload.dict()}"
#         )

#         if not payload.student_data:

#             raise HTTPException(
#                 status_code=400,
#                 detail="student_data is empty",
#             )

#         pdf_path = await ReportService.generate_student_report(
#             student_data=payload.student_data,
#         )

#         logger.info(
#             f"Generated PDF: {pdf_path}"
#         )

#         print("FINAL PDF PATH:", pdf_path)
#         print("EXISTS:", os.path.exists(pdf_path))

#         return FileResponse(
#             path=pdf_path,
#             media_type="application/pdf",
#             filename="student-report.pdf",
#         )

#     except Exception as e:

#         logger.exception(
#             "REPORT GENERATION FAILED"
#         )

#         raise HTTPException(
#             status_code=500,
#             detail=str(e),
#         )


# @router.post("/attendance-report")
# async def generate_attendance_report(
#     payload: AttendanceReportRequest,
# ):

#     pdf_path = await ReportService.generate_attendance_report(
#         attendance_data=payload.attendance_data,
#     )

#     return FileResponse(
#         path=pdf_path,
#         media_type="application/pdf",
#         filename=os.path.basename(pdf_path),
#     )


# from fastapi.responses import FileResponse
# import os


# @router.post("/batch-performance")
# async def generate_batch_performance_report(
#     payload: BatchReportRequest,
# ):

#     try:

#         pdf_path = await ReportService.generate_batch_report(
#             batch_data=payload.batch_data,
#         )

#         print("PDF PATH:", pdf_path)

#         if not os.path.exists(pdf_path):

#             raise Exception(
#                 f"PDF file not found: {pdf_path}"
#             )

#         return FileResponse(
#             path=pdf_path,
#             media_type="application/pdf",
#             filename=os.path.basename(pdf_path),
#         )

#     except Exception as e:

#         print("BATCH REPORT ERROR:", str(e))

#         raise HTTPException(
#             status_code=500,
#             detail=str(e),
#         )