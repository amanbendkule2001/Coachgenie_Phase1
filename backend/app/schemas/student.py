import re
import uuid
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, Any
from datetime import date


def sanitize_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v_clean = str(v).strip()
    if not v_clean:
        return None
    digits = re.sub(r"[^\d+]", "", v_clean)
    if len(re.sub(r"\D", "", digits)) < 7:
        raise ValueError("Phone number must have at least 7 digits.")
    return digits


def validate_pincode_format(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    v_clean = str(v).strip()
    if not re.match(r"^\d{5,10}$", v_clean):
        raise ValueError("Pincode must be between 5 and 10 digits.")
    return v_clean


class StudentCreate(BaseModel):
    enrollment_no: str = Field(min_length=1, max_length=50)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    school_name: Optional[str] = None
    current_class: Optional[str] = None
    target_exam: Optional[str] = None
    subjects: list[str] = []
    batch_id: Optional[uuid.UUID] = None
    joined_at: Optional[date] = None

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v

    @field_validator("phone", "parent_phone", mode="before")
    @classmethod
    def validate_phone(cls, v: Any) -> Any:
        return sanitize_phone(v) if v else v

    @field_validator("pincode", mode="before")
    @classmethod
    def validate_pincode(cls, v: Any) -> Any:
        return validate_pincode_format(v) if v else v


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    school_name: Optional[str] = None
    current_class: Optional[str] = None
    target_exam: Optional[str] = None
    subjects: Optional[list[str]] = None
    is_active: Optional[bool] = None

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v

    @field_validator("phone", "parent_phone", mode="before")
    @classmethod
    def validate_phone(cls, v: Any) -> Any:
        return sanitize_phone(v) if v else v

    @field_validator("pincode", mode="before")
    @classmethod
    def validate_pincode(cls, v: Any) -> Any:
        return validate_pincode_format(v) if v else v


class StudentOut(BaseModel):
    id: uuid.UUID
    enrollment_no: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    school_name: Optional[str] = None
    current_class: Optional[str] = None
    target_exam: Optional[str] = None
    subjects: list[str] = []
    batch_ids: list[str] = []
    admission_id: Optional[uuid.UUID] = None
    joined_at: Optional[Any] = None
    is_active: bool

    @model_validator(mode="before")
    @classmethod
    def extract_batch_ids(cls, obj: Any) -> Any:
        # Only apply when validating from ORM object (not a dict)
        if hasattr(obj, "batch_enrollments"):
            enrollments = obj.batch_enrollments
            # Handle both loaded and unloaded relationships safely
            try:
                batch_ids = [str(e.batch_id) for e in (enrollments or [])]
            except Exception:
                batch_ids = []
            # Pydantic needs a dict to merge extra fields
            data = {
                "id":            obj.id,
                "enrollment_no": obj.enrollment_no,
                "first_name":    obj.first_name,
                "last_name":     obj.last_name,
                "email":         obj.email,
                "phone":         obj.phone,
                "gender":        obj.gender,
                "date_of_birth": obj.date_of_birth,
                "address":       obj.address,
                "city":          obj.city,
                "state":         obj.state,
                "pincode":       obj.pincode,
                "parent_name":   obj.parent_name,
                "parent_phone":  obj.parent_phone,
                "parent_email":  obj.parent_email,
                "school_name":   obj.school_name,
                "current_class": obj.current_class,
                "target_exam":   obj.target_exam,
                "subjects":      obj.subjects or [],
                "is_active":     obj.is_active,
                "admission_id":  obj.admission_id,
                "joined_at":     obj.joined_at,
                "batch_ids":     batch_ids,  # ← populated from relationship
            }
            return data
        return obj

    class Config:
        from_attributes = True
