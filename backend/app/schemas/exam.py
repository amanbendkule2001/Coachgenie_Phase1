from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
import uuid


class ExamCreate(BaseModel):
    batch_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    title: str = Field(min_length=1, max_length=200)
    type: str = "unit_test"
    total_marks: float = Field(default=100.0, gt=0, description="Total marks must be positive")
    passing_marks: float = Field(default=35.0, ge=0, description="Passing marks cannot be negative")
    duration_min: int = Field(default=60, ge=15, le=720, description="Duration in minutes (15-720)")
    scheduled_at: Optional[str] = None
    instructions: Optional[str] = None

    @model_validator(mode="after")
    def validate_passing_marks(self):
        if self.passing_marks > self.total_marks:
            raise ValueError(f"Passing marks ({self.passing_marks}) cannot exceed total marks ({self.total_marks})")
        return self


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    scheduled_at: Optional[str] = None
    instructions: Optional[str] = None
    is_published: Optional[bool] = None
    total_marks: Optional[float] = Field(default=None, gt=0)
    passing_marks: Optional[float] = Field(default=None, ge=0)


class ExamOut(BaseModel):
    id: uuid.UUID
    title: str
    type: str
    total_marks: float
    passing_marks: float
    duration_min: int
    scheduled_at: Optional[str] = None
    is_published: bool

    class Config:
        from_attributes = True


class ExamResultIn(BaseModel):
    student_id: uuid.UUID
    marks_obtained: float = Field(ge=0, description="Marks obtained cannot be negative")
    remarks: Optional[str] = None


class BulkResultRequest(BaseModel):
    results: List[ExamResultIn]


class ExamResultOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    marks_obtained: float
    grade: Optional[str] = None
    rank_in_batch: Optional[int] = None
    is_pass: bool
    remarks: Optional[str] = None

    class Config:
        from_attributes = True
