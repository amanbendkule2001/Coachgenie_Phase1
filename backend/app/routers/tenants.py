# from fastapi import APIRouter, Depends
# from sqlalchemy import select
# from app.dependencies import DB
# from app.models.tenant import Tenant
# from app.schemas.tenant import TenantCreate, TenantOut
# from app.utils.exceptions import NotFoundError
# from sqlalchemy.exc import IntegrityError


# router = APIRouter(prefix="/tenants", tags=["Tenants"])

# # commented this part ////////////////
# # @router.post("/", response_model=TenantOut, status_code=201)
# # async def create_tenant(body: TenantCreate, db: DB):
# #     tenant = Tenant(**body.model_dump())
# #     db.add(tenant)
# #     await db.flush()
# #     return tenant
# # ///////////////////////////////

# @router.post("/", response_model=TenantOut, status_code=201)
# async def create_tenant(body: TenantCreate, db: DB):

#     result = await db.execute(
#         select(Tenant).where(Tenant.subdomain == body.subdomain)
#     )
#     if result.scalar_one_or_none():
#         raise HTTPException(status_code=400, detail="Subdomain already exists")

#     tenant = Tenant(**body.model_dump())

#     try:
#         db.add(tenant)
#         await db.commit()
#         await db.refresh(tenant)

#     except IntegrityError:
#         await db.rollback()
#         raise HTTPException(status_code=400, detail="Subdomain already exists")

#     return tenant

# @router.get("/{subdomain}", response_model=TenantOut)
# async def get_tenant_by_subdomain(subdomain: str, db: DB):
#     result = await db.execute(select(Tenant).where(Tenant.subdomain == subdomain))
#     tenant = result.scalar_one_or_none()
#     if not tenant:
#         raise NotFoundError("Tenant")
#     return tenant

# from fastapi import HTTPException
# from sqlalchemy import select
# from sqlalchemy.exc import IntegrityError

# from app.models.user import User
# from app.utils.security import hash_password
import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import flag_modified

from app.dependencies import DB, CurrentUser, CurrentTenant
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantOut, TenantDetailOut, TenantSettingsUpdate
from app.utils.security import hash_password

logger = logging.getLogger("coaching_erp")

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("/", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
async def create_tenant(body: TenantCreate, db: DB):
    # 1. Check subdomain exists
    result = await db.execute(
        select(Tenant).where(Tenant.subdomain == body.subdomain.strip().lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Subdomain already exists")

    # 2. Create tenant with default settings
    default_settings = {
        "name": body.name,
        "attendanceThreshold": 75,
        "autoNotifyAbsentees": True,
        "defaultPassingPct": 40,
        "lateFeePenaltyPerDay": 50,
        "aiCopilotModel": "llama3-70b-8192",
        "whatsappNotifications": True,
        "primaryColor": "#7c3aed",
    }

    tenant = Tenant(
        name=body.name,
        subdomain=body.subdomain.strip().lower(),
        settings=default_settings,
    )

    db.add(tenant)
    await db.flush()  # gets tenant.id

    try:
        # 3. Create owner user
        user = User(
            tenant_id=tenant.id,
            email=body.owner_email.strip().lower(),
            password_hash=hash_password(body.owner_password),
            first_name=body.owner_first_name,
            role="owner",
            is_active=True,
        )

        db.add(user)
        await db.commit()
        await db.refresh(tenant)

    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Unable to create tenant and owner user")

    return tenant


@router.get("/me", response_model=TenantDetailOut)
async def get_current_tenant_profile(
    current_tenant: CurrentTenant,
    current_user: CurrentUser,
):
    """
    Get current logged-in tenant profile and settings.
    Accessible to all authenticated staff members.
    """
    return current_tenant


@router.get("/settings")
async def get_tenant_settings(
    current_tenant: CurrentTenant,
    current_user: CurrentUser,
):
    """
    Get active module settings for current tenant.
    Accessible to all authenticated staff members.
    """
    settings = current_tenant.settings or {}
    # If institute name or profile keys are set at tenant level, include them
    if "name" not in settings and current_tenant.name:
        settings["name"] = current_tenant.name

    return {
        "status": "success",
        "tenant_id": str(current_tenant.id),
        "name": current_tenant.name,
        "subdomain": current_tenant.subdomain,
        "plan": current_tenant.plan,
        "settings": settings,
        "user_role": current_user.role,
        "can_edit": current_user.role in ["owner", "admin", "SUPER_ADMIN", "super_admin"],
    }


@router.put("/settings")
async def update_tenant_settings(
    body: TenantSettingsUpdate,
    db: DB,
    current_tenant: CurrentTenant,
    current_user: CurrentUser,
):
    """
    Update tenant settings with Role-Based Access Control (RBAC).
    Only Owners and Admins are permitted to update system-wide settings.
    """
    # 🛡️ RBAC Check: Only owner and admin roles can modify settings
    allowed_roles = ["owner", "admin", "SUPER_ADMIN", "super_admin"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Role '{current_user.role}' is not authorized to edit institute settings. Only Institute Owners and Admins can save changes.",
        )

    existing_settings = dict(current_tenant.settings or {})
    payload_dict = body.model_dump(exclude_unset=True)

    # If top-level name is updated, reflect in Tenant.name as well
    if body.name and body.name.strip():
        current_tenant.name = body.name.strip()
        existing_settings["name"] = body.name.strip()

    # Merge nested or explicit setting fields
    if "settings" in payload_dict and isinstance(payload_dict["settings"], dict):
        existing_settings.update(payload_dict["settings"])

    for field, val in payload_dict.items():
        if field not in ["settings"] and val is not None:
            existing_settings[field] = val

    current_tenant.settings = existing_settings
    flag_modified(current_tenant, "settings")

    try:
        await db.commit()
        await db.refresh(current_tenant)
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update tenant settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings to database")

    return {
        "status": "success",
        "message": "Settings updated successfully",
        "name": current_tenant.name,
        "settings": current_tenant.settings,
        "updated_by": current_user.email,
        "role": current_user.role,
    }


@router.get("/{subdomain}", response_model=TenantOut)
async def get_tenant_by_subdomain(subdomain: str, db: DB):
    result = await db.execute(select(Tenant).where(Tenant.subdomain == subdomain.strip().lower()))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant