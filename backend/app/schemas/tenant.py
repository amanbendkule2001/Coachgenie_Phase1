from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime
import uuid


class TenantCreate(BaseModel):
    name: str
    subdomain: str
    owner_email: str
    owner_password: str
    owner_first_name: str

class TenantOut(BaseModel):
    id: uuid.UUID
    name: str
    subdomain: str
    plan: str
    is_active: bool

    class Config:
        from_attributes = True

class TenantSettingsUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    website: Optional[str] = None
    primaryColor: Optional[str] = None
    attendanceThreshold: Optional[int] = 75
    autoNotifyAbsentees: Optional[bool] = True
    defaultPassingPct: Optional[int] = 40
    lateFeePenaltyPerDay: Optional[int] = 50
    aiCopilotModel: Optional[str] = "llama3-70b-8192"
    whatsappNotifications: Optional[bool] = True
    settings: Optional[dict[str, Any]] = None

class TenantDetailOut(BaseModel):
    id: uuid.UUID
    name: str
    subdomain: str
    plan: str
    is_active: bool
    settings: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

