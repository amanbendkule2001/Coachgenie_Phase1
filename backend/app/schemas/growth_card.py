from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class GrowthCardCreate(BaseModel):
    student_id: uuid.UUID
    period_label: str = Field(min_length=1, max_length=50)
    academic_score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Score between 0 and 100")
    attendance_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Attendance percentage between 0 and 100")
    behavior_rating: Optional[int] = Field(default=None, ge=1, le=5, description="Behavior rating between 1 and 5")
    strengths: Optional[str] = None
    improvement_areas: Optional[str] = None
    tutor_remarks: Optional[str] = None


class GrowthCardUpdate(BaseModel):
    academic_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    attendance_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    behavior_rating: Optional[int] = Field(default=None, ge=1, le=5)
    strengths: Optional[str] = None
    improvement_areas: Optional[str] = None
    tutor_remarks: Optional[str] = None
    parent_seen: Optional[bool] = None


class GrowthCardOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    period_label: str
    academic_score: Optional[float] = None
    attendance_percent: Optional[float] = None
    behavior_rating: Optional[int] = None
    strengths: Optional[str] = None
    improvement_areas: Optional[str] = None
    tutor_remarks: Optional[str] = None
    parent_seen: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True