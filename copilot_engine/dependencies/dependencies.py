from uuid import UUID

from fastapi import (
    Header,
    HTTPException,
    status,
)

async def get_tenant_id(
    x_tenant_id: str = Header(
        alias="X-Tenant-ID",
    ),
) -> UUID:
    """
    Returns the current tenant id from request headers.

    Backend sends:
        X-Tenant-ID

    Copilot Engine remains completely independent
    from backend internals.
    """

    if not x_tenant_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Tenant-ID header.",
        )

    return UUID(x_tenant_id)

async def get_user_id(
    x_user_id: str = Header(
        alias="X-User-ID",
    ),
) -> UUID:

    if not x_user_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-User-ID header.",
        )

    return UUID(x_user_id)