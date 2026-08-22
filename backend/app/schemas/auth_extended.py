import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Must contain uppercase letter.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Must contain lowercase letter.")
    if not re.search(r"\d", v):
        raise ValueError("Must contain a digit.")
    if not re.search(r"[@$!%*?&]", v):
        raise ValueError("Must contain special character (@$!%*?&).")
    return v


def validate_otp_format(v: str) -> str:
    v_clean = str(v).strip()
    if not re.match(r"^\d{6}$", v_clean):
        raise ValueError("OTP must be exactly 6 digits.")
    return v_clean


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        return validate_otp_format(v)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        return validate_otp_format(v)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return validate_password_strength(v)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "owner@demo.com",
                "otp": "123456",
                "new_password": "NewPass@1234"
            }
        }


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileOut(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    tenant_id: str

    class Config:
        from_attributes = True
