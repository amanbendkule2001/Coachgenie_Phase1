from pydantic import BaseModel


class StudentReportRequest(BaseModel):

    student_id: str


class BatchReportRequest(BaseModel):

    batch_id: str


class AttendanceReportRequest(BaseModel):

    batch_id: str


class AdmissionReportRequest(BaseModel):

    pass