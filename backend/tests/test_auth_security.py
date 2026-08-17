import pytest
from httpx import AsyncClient
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.security import hash_password

@pytest.mark.asyncio
async def test_authentication_security_and_token_tampering(client: AsyncClient, db_session):
    """
    SECURITY TEST: Verify invalid credentials, missing headers, and tampered token rejection.
    """
    # 1. Setup Tenant & User
    tenant = Tenant(name="Auth Security Institute", subdomain="sec-auth", is_active=True)
    db_session.add(tenant)
    await db_session.flush()

    user = User(tenant_id=str(tenant.id), email="admin@sec-auth.com", password_hash=hash_password("Secret123"), role="owner", first_name="Auth", last_name="Admin")
    db_session.add(user)
    await db_session.commit()

    # 2. Invalid Password Login -> 401 Unauthorized
    res_wrong_pw = await client.post(
        "/api/v1/auth/login",
        headers={"X-Tenant-Subdomain": "sec-auth"},
        json={"email": "admin@sec-auth.com", "password": "WrongPassword"}
    )
    assert res_wrong_pw.status_code == 401, f"Expected 401, got {res_wrong_pw.status_code}"

    # 3. Missing Tenant Header Login -> 400 Bad Request
    res_no_tenant = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sec-auth.com", "password": "Secret123"}
    )
    assert res_no_tenant.status_code >= 400, f"Expected error, got {res_no_tenant.status_code}"

    # 4. Tampered Bearer Token -> 401 Unauthorized
    headers_tampered = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidtsignature",
        "X-Tenant-Subdomain": "sec-auth",
    }
    res_tampered = await client.get("/api/v1/dashboard/owner", headers=headers_tampered)
    assert res_tampered.status_code == 401, f"Expected 401 for tampered token, got {res_tampered.status_code}"
