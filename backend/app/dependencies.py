# from fastapi import Depends, Header, Request
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, and_
# from typing import Annotated

# from app.database import get_db
# from app.models.tenant import Tenant
# from app.models.user import User
# from app.utils.security import decode_access_token
# from app.utils.exceptions import UnauthorizedError, ForbiddenError, TenantNotFoundError
# import uuid


# async def get_tenant(
#     db: AsyncSession = Depends(get_db),

#     x_tenant_subdomain: str | None = Header(default=None),  # ← matches "X-Tenant-Subdomain"
#     x_tenant_id: str | None = Header(default=None),         # ← fallback for old header

# ) -> Tenant:
#     """
#     Accepts X-Tenant-Subdomain (primary) or X-Tenant-Id (fallback).
#     Automatically detects UUID vs subdomain string.
#     """

#     # prefer X-Tenant-Subdomain, fall back to X-Tenant-Id
#     raw = x_tenant_subdomain or x_tenant_id

#     if not raw:
#         raise TenantNotFoundError("X-Tenant-Subdomain header is missing")


#     # detect if UUID → query by id, otherwise query by subdomain


#     # detect if UUID ? query by id, otherwise query by subdomain
#     try:
#         uuid.UUID(raw)
#         query = select(Tenant).where(Tenant.id == raw)
#     except ValueError:
#         query = select(Tenant).where(Tenant.subdomain == raw)

#     result = await db.execute(query)
#     tenant = result.scalar_one_or_none()

#     if not tenant or not tenant.is_active:
#         raise TenantNotFoundError(f"Tenant '{raw}' not found or inactive")

#     return tenant


# # async def get_current_user(
# #     request: Request,
# #     db: AsyncSession = Depends(get_db),
# #     tenant: Tenant = Depends(get_tenant),
# # ) -> User:
# #     auth_header = request.headers.get("Authorization", "")
# #     if not auth_header.startswith("Bearer "):
# #         raise UnauthorizedError("No token provided.")

# #     token = auth_header.split(" ")[1]
# #     payload = decode_access_token(token)

# #     result = await db.execute(
# #         select(User).where(
# #             and_(
# #                 User.id == uuid.UUID(payload["sub"]),
# #                 User.tenant_id == tenant.id,
# #             )
# #         )
# #     )
# #     user = result.scalar_one_or_none()
# #     if not user or not user.is_active:
# #         raise UnauthorizedError("User not found or inactive.")
# #     return user
# async def get_current_user(
#     request: Request,
#     db: AsyncSession = Depends(get_db),
#     tenant: Tenant = Depends(get_tenant),
# ) -> User:
#     auth_header = request.headers.get("Authorization", "")
#     if not auth_header.startswith("Bearer "):
#         raise UnauthorizedError("No token provided.")

#     token = auth_header.split(" ")[1]
#     payload = decode_access_token(token)


#     # ✅ handle both camelCase and snake_case
#     tenant_id = payload.get("tenant_id") or payload.get("tenantId")



#     result = await db.execute(
#         select(User).where(
#             and_(
#                 User.id == uuid.UUID(payload["sub"]),
#                 User.tenant_id == tenant.id,
#             )
#         )
#     )
#     user = result.scalar_one_or_none()
#     if not user or not user.is_active:
#         raise UnauthorizedError("User not found or inactive.")
#     return user


# def require_roles(*roles: str):
#     async def checker(
#         current_user: User = Depends(get_current_user),
#     ) -> User:
#         if current_user.role not in roles:
#             raise ForbiddenError(
#                 f"Required roles: {roles}. Your role: {current_user.role}"
#             )
#         return current_user
#     return checker



# # ── Simple type aliases ───────────────────────────────────────
# DB            = Annotated[AsyncSession, Depends(get_db)]
# CurrentUser   = Annotated[User,         Depends(get_current_user)]
# CurrentTenant = Annotated[Tenant,       Depends(get_tenant)]


# # -- Simple type aliases ---------------------------------------
# -- Simple type aliases ---------------------------------------
# DB            = Annotated[AsyncSession, Depends(get_db)]
# CurrentUser   = Annotated[User,         Depends(get_current_user)]
# CurrentTenant = Annotated[Tenant,       Depends(get_tenant)]



import logging
import uuid

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Annotated

from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.security import decode_access_token
from app.utils.exceptions import (
    UnauthorizedError,
    ForbiddenError,
    TenantNotFoundError,
)

logger = logging.getLogger("coaching_erp")


async def get_tenant(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_tenant_subdomain: str | None = Header(default=None),
    x_tenant_id: str | None = Header(default=None),
) -> Tenant:
    raw = x_tenant_subdomain or x_tenant_id

    if not raw or not raw.strip():
        # Check if auth token has tenant_id before failing
        auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            try:
                token = auth_hdr.split(" ")[1]
                payload = decode_access_token(token)
                tid = payload.get("tenant_id") or payload.get("tenantId")
                if tid:
                    raw = str(tid)
            except Exception:
                pass

        if not raw or not raw.strip():
            raise TenantNotFoundError("Institute code (X-Tenant-Subdomain) is required.")

    sub_clean = raw.strip().lower()

    try:
        uuid_val = uuid.UUID(sub_clean)
        stmt = select(Tenant).where(Tenant.id == uuid_val)
    except ValueError:
        stmt = select(Tenant).where(func.lower(Tenant.subdomain) == sub_clean)

    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    # Only provision demo if the user specifically requested "demo"
    if not tenant and sub_clean == "demo":
        try:
            from app.services.tenant_provisioning import ensure_demo_tenant
            await ensure_demo_tenant()
            stmt_demo = select(Tenant).where(Tenant.subdomain == "demo")
            tenant = (await db.execute(stmt_demo)).scalar_one_or_none()
        except Exception as err:
            logger.warning(f"Demo tenant on-demand provisioning note: {err}")

    if not tenant or not tenant.is_active:
        logger.warning(f"Tenant resolution failed for institute code: '{raw}'")
        raise TenantNotFoundError(f"Institute code '{raw}' is invalid or does not exist.")

    return tenant


from fastapi.security import HTTPBearer

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    token_obj = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
) -> User:

    auth_header = request.headers.get("Authorization", "")
    if not auth_header and token_obj:
        auth_header = f"Bearer {token_obj.credentials}"

    if not auth_header.startswith("Bearer "):
        raise UnauthorizedError("No token provided.")

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)

    result = await db.execute(
        select(User).where(
            and_(
                User.id == uuid.UUID(payload["sub"]),
                User.tenant_id == tenant.id,
            )
        )
    )

    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive.")

    return user


def require_roles(*roles: str):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenError(
                f"Required roles: {roles}. Your role: {current_user.role}"
            )
        return current_user

    return checker


DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentTenant = Annotated[Tenant, Depends(get_tenant)]