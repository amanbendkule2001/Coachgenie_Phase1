import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Any
import uuid
from datetime import date, datetime

VALID_LEAD_STAGES = {
    "new", "contacted", "interested", "demo_scheduled", "demo_done",
    "negotiation", "enrolled", "lost", "converted"
}

VALID_LEAD_SOURCES = {
    "website", "walk_in", "walk-in", "referral", "social_media",
    "google_ads", "campaign", "other", "direct", "manual"
}


def sanitize_phone_number(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v_clean = str(v).strip()
    if not v_clean:
        return None
    # Remove common formatting characters
    digits_and_plus = re.sub(r"[^\d+]", "", v_clean)
    if len(re.sub(r"\D", "", digits_and_plus)) < 7:
        raise ValueError("Phone number must have at least 7 digits.")
    return digits_and_plus


class LeadCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    phone: str
    email: Optional[EmailStr] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_contact_number: Optional[str] = None
    school_name: Optional[str] = None
    source: str = "website"
    status: Optional[str] = "new"
    interested_course: Optional[str] = None
    grade: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    assigned_to: Optional[uuid.UUID] = None
    board_name: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    subjects: Optional[List[str]] = []

    @field_validator("phone", "parent_phone", "parent_contact_number", mode="before")
    @classmethod
    def validate_phone(cls, v: Any) -> Any:
        return sanitize_phone_number(v) if v else v

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Any:
        if v:
            v_norm = str(v).strip().lower()
            if v_norm in VALID_LEAD_STAGES:
                return v_norm
        return "new"

    @field_validator("source", mode="before")
    @classmethod
    def validate_source(cls, v: Any) -> Any:
        if v:
            v_norm = str(v).strip().lower().replace("-", "_")
            if v_norm in VALID_LEAD_SOURCES:
                return v_norm
        return "website"


class LeadUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_contact_number: Optional[str] = None
    school_name: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    interested_course: Optional[str] = None
    grade: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    assigned_to: Optional[uuid.UUID] = None
    board_name: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    subjects: Optional[List[str]] = None

    @field_validator("phone", "parent_phone", "parent_contact_number", mode="before")
    @classmethod
    def validate_phone(cls, v: Any) -> Any:
        return sanitize_phone_number(v) if v else v

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Any:
        if v:
            v_norm = str(v).strip().lower()
            if v_norm in VALID_LEAD_STAGES:
                return v_norm
        return v


class ActivityCreate(BaseModel):
    type: str = "NOTE"
    description: Optional[str] = None
    content: Optional[str] = None
    created_by: Optional[str] = None


class ActivityOut(BaseModel):
    id: uuid.UUID
    lead_id: Optional[uuid.UUID] = None
    type: str
    description: str
    content: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_activity(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            d = getattr(data, "__dict__", {})
            user = d.get("user")
            creator = "Staff Counselor"
            if user:
                ud = getattr(user, "__dict__", {})
                first = ud.get("first_name", "") or ""
                last = ud.get("last_name", "") or ""
                name = f"{first} {last}".strip()
                creator = name if name else (ud.get("email", "") or "Staff Counselor")
            desc = d.get("description", "") or ""
            return {
                "id": d.get("id"),
                "lead_id": d.get("lead_id"),
                "type": d.get("type", "NOTE"),
                "description": desc,
                "content": desc,
                "created_by": creator,
                "created_at": d.get("created_at"),
            }
        desc = data.get("description") or data.get("content") or ""
        data["description"] = desc
        if "content" not in data or not data["content"]:
            data["content"] = desc
        return data


class LeadOut(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    email: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_contact_number: Optional[str] = None
    school_name: Optional[str] = None
    source: str
    status: str
    interested_course: Optional[str] = None
    grade: Optional[str] = None
    follow_up_date: Optional[date] = None
    notes: Optional[str] = None
    board_name: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    batch_name: Optional[str] = None
    subjects: Optional[List[str]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    activities: Optional[List[ActivityOut]] = []

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_lead(cls, obj: Any) -> Any:
        if not isinstance(obj, dict):
            d = getattr(obj, "__dict__", {})
            acts = []
            if "activities" in d and d["activities"]:
                try:
                    acts = [ActivityOut.model_validate(a) for a in d["activities"]]
                except Exception:
                    acts = []

            return {
                "id": d.get("id"),
                "full_name": d.get("full_name", ""),
                "phone": d.get("phone", ""),
                "email": d.get("email"),
                "parent_name": d.get("parent_name"),
                "parent_phone": d.get("parent_phone"),
                "parent_contact_number": d.get("parent_contact_number"),
                "school_name": d.get("school_name"),
                "source": d.get("source", "website"),
                "status": d.get("status", "new"),
                "interested_course": d.get("interested_course"),
                "grade": d.get("grade"),
                "follow_up_date": d.get("follow_up_date"),
                "notes": d.get("notes"),
                "board_name": d.get("board_name"),
                "batch_id": d.get("batch_id"),
                "batch_name": d.get("batch_name"),
                "subjects": d.get("subjects") or [],
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "activities": acts,
            }
        return obj