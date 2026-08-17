import pytest
from httpx import AsyncClient
from app.models.tenant import Tenant
from app.models.user import User
from app.models.student import Student
from app.models.admission import Admission
from app.models.lead import Lead
from app.models.batch import Batch
from app.utils.security import hash_password, create_access_token

@pytest.mark.asyncio
async def test_cross_tenant_idor_security_isolation(client: AsyncClient, db_session):
    """
    SECURITY TEST: Verify strict multi-tenant isolation.
    Tenant B user MUST NOT be able to view, edit, or delete Tenant A resources (IDOR / BOLA vulnerability test).
    """
    # 1. Create Tenant A & Tenant B
    tenant_a = Tenant(name="Institute A", subdomain="tenant-a", is_active=True)
    tenant_b = Tenant(name="Institute B", subdomain="tenant-b", is_active=True)
    db_session.add_all([tenant_a, tenant_b])
    await db_session.flush()

    # 2. Create Owners
    user_a = User(tenant_id=str(tenant_a.id), email="owner@tenant-a.com", password_hash=hash_password("Pass@123"), role="owner", first_name="Owner", last_name="A")
    user_b = User(tenant_id=str(tenant_b.id), email="owner@tenant-b.com", password_hash=hash_password("Pass@123"), role="owner", first_name="Owner", last_name="B")
    db_session.add_all([user_a, user_b])
    await db_session.flush()

    # 3. Create Tenant A Resources (Admission, Student, Lead, Batch)
    admission_a = Admission(tenant_id=str(tenant_a.id), admission_number="ADM-A-01", academic_year="2024-25", applied_course="Math")
    db_session.add(admission_a)
    await db_session.flush()

    student_a = Student(tenant_id=str(tenant_a.id), admission_id=admission_a.id, enrollment_no="STU-A-01", first_name="TenantA", last_name="Student", is_active=True)
    lead_a = Lead(tenant_id=str(tenant_a.id), full_name="TenantA Lead", phone="9876543210", status="new")
    batch_a = Batch(tenant_id=str(tenant_a.id), name="Batch A", academic_year="2024-25")
    db_session.add_all([student_a, lead_a, batch_a])
    await db_session.commit()

    # 4. Generate Auth Tokens
    token_b = create_access_token({"sub": str(user_b.id), "tenant_id": str(tenant_b.id), "role": "owner"})
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Tenant-Subdomain": "tenant-b",
    }

    # 5. Attempt Cross-Tenant Access to Tenant A Student
    res_student_get = await client.get(f"/api/v1/students/{student_a.id}", headers=headers_b)
    assert res_student_get.status_code in (404, 403), "Security Breach: Tenant B accessed Tenant A Student!"

    res_student_delete = await client.delete(f"/api/v1/students/{student_a.id}", headers=headers_b)
    assert res_student_delete.status_code in (404, 403), "Security Breach: Tenant B deleted Tenant A Student!"

    # 6. Attempt Cross-Tenant Access to Tenant A Lead
    res_lead_get = await client.get(f"/api/v1/leads/{lead_a.id}", headers=headers_b)
    assert res_lead_get.status_code in (404, 403), "Security Breach: Tenant B accessed Tenant A Lead!"

    res_lead_stage = await client.post(
        f"/api/v1/leads/{lead_a.id}/change-stage",
        json={"stage": "enrolled"},
        headers=headers_b
    )
    assert res_lead_stage.status_code in (404, 403), "Security Breach: Tenant B modified Tenant A Lead stage!"

    # 7. Attempt Cross-Tenant Access to Tenant A Batch
    res_batch_get = await client.get(f"/api/v1/batches/{batch_a.id}", headers=headers_b)
    assert res_batch_get.status_code in (404, 403), "Security Breach: Tenant B accessed Tenant A Batch!"
