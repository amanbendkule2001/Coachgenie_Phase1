# copilot_engine/schemas/report_requests.py

from pydantic import BaseModel
from typing import Optional


class StudentReportRequest(BaseModel):

    student_id: str


class BatchReportRequest(BaseModel):

    batch_id: str


class AttendanceReportRequest(BaseModel):
    
    batch_id: str
    from_date: Optional[str] = None
    to_date: Optional[str] = None


class AdmissionReportRequest(BaseModel):

    pass