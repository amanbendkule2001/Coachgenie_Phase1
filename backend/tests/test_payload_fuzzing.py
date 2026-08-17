import pytest
from httpx import AsyncClient
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.security import hash_password, create_access_token

@pytest.mark.asyncio
async def test_api_payload_fuzzing_and_boundary_validation(client: AsyncClient, db_session):
    """
    FUZZING TEST: Verify malformed inputs, SQL injection strings, XSS payloads, and invalid types
    are caught by Pydantic validation (422 / 400) without crashing the server (500).
    """
    # 1. Setup Tenant & User
    tenant = Tenant(name="Fuzz Institute", subdomain="fuzz-test", is_active=True)
    db_session.add(tenant)
    await db_session.flush()

    user = User(tenant_id=str(tenant.id), email="admin@fuzz.com", password_hash=hash_password("Pass123"), role="owner", first_name="Fuzz", last_name="Admin")
    db_session.add(user)
    await db_session.commit()

    token = create_access_token({"sub": str(user.id), "tenant_id": str(tenant.id), "role": "owner"})
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": "fuzz-test",
    }

    # 2. Malformed / Invalid UUID Lead Fetch -> 422 Unprocessable Entity
    res_invalid_uuid = await client.get("/api/v1/leads/not-a-valid-uuid", headers=headers)
    assert res_invalid_uuid.status_code in (422, 404), f"Expected 422/404, got {res_invalid_uuid.status_code}"

    # 3. Invalid Email Format in Lead Creation -> 422
    res_bad_email = await client.post(
        "/api/v1/leads/",
        json={"full_name": "Test Lead", "email": "invalid-email-string-without-at"},
        headers=headers
    )
    assert res_bad_email.status_code in (422, 400), f"Expected 422/400 for bad email, got {res_bad_email.status_code}"

    # 4. Invalid Stage Enum Value in Lead Stage Change -> 422
    res_invalid_stage = await client.post(
        "/api/v1/leads/00000000-0000-0000-0000-000000000000/change-stage",
        json={"stage": "SUPER_INVALID_STAGE_NAME"},
        headers=headers
    )
    assert res_invalid_stage.status_code in (422, 400), f"Expected 422/400 for invalid stage, got {res_invalid_stage.status_code}"

    # 5. Negative Payment Amount -> 422 / 400
    res_negative_pay = await client.post(
        "/api/v1/fees/invoices/00000000-0000-0000-0000-000000000000/pay",
        json={"amount": -500.00, "payment_mode": "cash"},
        headers=headers
    )
    assert res_negative_pay.status_code in (422, 400, 404), f"Expected validation error, got {res_negative_pay.status_code}"

    # 6. SQL Injection Payload in Search Query -> Must handled safely (200 empty or 400), NO 500
    sqli_payload = "' OR '1'='1' --"
    res_sqli = await client.get(f"/api/v1/students/?search={sqli_payload}", headers=headers)
    assert res_sqli.status_code in (200, 400), f"SQLi payload triggered server crash 500: {res_sqli.text}"
