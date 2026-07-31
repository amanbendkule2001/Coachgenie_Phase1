import uuid

import pytest
from sqlalchemy import select, and_

from app.models.tenant import Tenant
from app.models.student import Student
from app.models.fee import FeeInvoice


async def _make_other_tenant(db_session) -> Tenant:
    t = Tenant(
        id=uuid.uuid4(),
        name="Other Tenant",
        subdomain=f"other-{uuid.uuid4().hex[:8]}",
        plan="basic",
        is_active=True,
        settings={},
    )
    db_session.add(t)
    await db_session.flush()
    return t


async def _headers_for_role(db_session, tenant, role):
    from tests.conftest import _make_user, make_access_token

    user = await _make_user(db_session, tenant, role)
    token = make_access_token(user, tenant)
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }


# ── List ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_admissions_requires_auth(client, tenant):
    res = await client.get(
        "/api/v1/admissions/", headers={"X-Tenant-Subdomain": tenant.subdomain}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_admissions_rejects_tutor(client, db_session, tenant):
    headers = await _headers_for_role(db_session, tenant, "tutor")
    res = await client.get("/api/v1/admissions/", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_list_admissions_as_owner(client, owner_headers):
    res = await client.get("/api/v1/admissions/", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_list_admissions_as_counselor(client, db_session, tenant):
    headers = await _headers_for_role(db_session, tenant, "counselor")
    res = await client.get("/api/v1/admissions/", headers=headers)
    assert res.status_code == 200


# ── Create ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_admission_rejects_tutor(client, db_session, tenant):
    headers = await _headers_for_role(db_session, tenant, "tutor")
    res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Rejected"}, headers=headers
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_admission_as_counselor_minimal_body(client, db_session, tenant):
    headers = await _headers_for_role(db_session, tenant, "counselor")
    res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Kabir Mehta"}, headers=headers
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["student_name"] == "Kabir Mehta"
    assert data["status"] == "PENDING_DOCS"
    assert data["admission_number"].startswith("ADM-")


@pytest.mark.asyncio
async def test_create_admission_generates_linked_student(client, owner_headers, db_session, tenant):
    res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Nisha Rao"}, headers=owner_headers
    )
    assert res.status_code == 201
    admission_id = res.json()["data"]["id"]

    student = await db_session.scalar(
        select(Student).where(
            and_(
                Student.tenant_id == tenant.id,
                Student.admission_id == uuid.UUID(admission_id),
            )
        )
    )
    assert student is not None
    assert student.first_name == "Nisha"
    assert student.last_name == "Rao"


@pytest.mark.asyncio
async def test_create_admission_with_fee_amount_generates_invoice(client, owner_headers, db_session, tenant):
    res = await client.post(
        "/api/v1/admissions/",
        json={"student_name": "Rohan Iyer", "fee_amount": 15000, "fee_paid": 5000},
        headers=owner_headers,
    )
    assert res.status_code == 201
    admission_number = res.json()["data"]["admission_number"]

    invoice = await db_session.scalar(
        select(FeeInvoice).where(FeeInvoice.invoice_no == f"INV-{admission_number}")
    )
    assert invoice is not None
    assert float(invoice.amount_due) == 15000
    assert float(invoice.amount_paid) == 5000
    assert invoice.status == "partial"


@pytest.mark.asyncio
async def test_create_admission_without_fee_amount_no_invoice(client, owner_headers, db_session, tenant):
    res = await client.post(
        "/api/v1/admissions/", json={"student_name": "No Fee Student"}, headers=owner_headers
    )
    assert res.status_code == 201
    admission_number = res.json()["data"]["admission_number"]

    invoice = await db_session.scalar(
        select(FeeInvoice).where(FeeInvoice.invoice_no == f"INV-{admission_number}")
    )
    assert invoice is None


# ── Get ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_admission_own_tenant(client, owner_headers):
    create_res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Fetch Me"}, headers=owner_headers
    )
    admission_id = create_res.json()["data"]["id"]

    res = await client.get(f"/api/v1/admissions/{admission_id}", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["data"]["student_name"] == "Fetch Me"


@pytest.mark.asyncio
async def test_get_admission_cross_tenant_returns_404(client, owner_headers, db_session, tenant):
    other_tenant = await _make_other_tenant(db_session)
    other_headers = await _headers_for_role(db_session, other_tenant, "owner")

    create_res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Belongs to Other"}, headers=other_headers
    )
    other_admission_id = create_res.json()["data"]["id"]

    res = await client.get(f"/api/v1/admissions/{other_admission_id}", headers=owner_headers)
    assert res.status_code == 404


# ── Update ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_admission_rejects_tutor(client, db_session, tenant, owner_headers):
    create_res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Locked"}, headers=owner_headers
    )
    admission_id = create_res.json()["data"]["id"]

    headers = await _headers_for_role(db_session, tenant, "tutor")
    res = await client.patch(
        f"/api/v1/admissions/{admission_id}",
        json={"remarks": "should not apply"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_admission_basic_field(client, owner_headers):
    create_res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Editable"}, headers=owner_headers
    )
    admission_id = create_res.json()["data"]["id"]

    res = await client.patch(
        f"/api/v1/admissions/{admission_id}",
        json={"remarks": "Docs pending signature"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["remarks"] == "Docs pending signature"


@pytest.mark.asyncio
async def test_update_admission_status_to_confirmed_generates_student_if_missing(
    client, owner_headers, db_session, tenant
):
    """
    create_admission already auto-generates a student immediately, so this
    mainly confirms the transition doesn't error and status persists --
    the "generate on CONFIRMED transition" guard in update_admission is a
    no-op safety net given current create_admission behavior, but it must
    not break the update itself.
    """
    create_res = await client.post(
        "/api/v1/admissions/", json={"student_name": "Transition Test"}, headers=owner_headers
    )
    admission_id = create_res.json()["data"]["id"]
    assert create_res.json()["data"]["status"] == "PENDING_DOCS"

    res = await client.patch(
        f"/api/v1/admissions/{admission_id}",
        json={"status": "CONFIRMED"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "CONFIRMED"

    student = await db_session.scalar(
        select(Student).where(
            and_(
                Student.tenant_id == tenant.id,
                Student.admission_id == uuid.UUID(admission_id),
            )
        )
    )
    assert student is not None


# ── Regression: tenant-scoped invoice uniqueness (see admission_fixes.md) ──


@pytest.mark.asyncio
async def test_invoice_created_per_tenant_despite_matching_admission_number(
    client, owner_headers, db_session, tenant
):
    """
    Two brand-new tenants both generate ADM-<year>-0001 as their first
    admission number. Before the fix, the second tenant's invoice creation
    was silently skipped because the uniqueness check wasn't tenant-scoped.
    """
    other_tenant = await _make_other_tenant(db_session)
    other_headers = await _headers_for_role(db_session, other_tenant, "owner")

    res_a = await client.post(
        "/api/v1/admissions/",
        json={"student_name": "Tenant A Student", "fee_amount": 5000},
        headers=owner_headers,
    )
    assert res_a.status_code == 201
    admission_number_a = res_a.json()["data"]["admission_number"]

    res_b = await client.post(
        "/api/v1/admissions/",
        json={"student_name": "Tenant B Student", "fee_amount": 7000},
        headers=other_headers,
    )
    assert res_b.status_code == 201
    admission_number_b = res_b.json()["data"]["admission_number"]

    # Confirms the collision scenario actually occurred
    assert admission_number_a == admission_number_b

    invoice_a = await db_session.scalar(
        select(FeeInvoice).where(
            and_(
                FeeInvoice.tenant_id == str(tenant.id),
                FeeInvoice.invoice_no == f"INV-{admission_number_a}",
            )
        )
    )
    invoice_b = await db_session.scalar(
        select(FeeInvoice).where(
            and_(
                FeeInvoice.tenant_id == str(other_tenant.id),
                FeeInvoice.invoice_no == f"INV-{admission_number_b}",
            )
        )
    )

    assert invoice_a is not None
    assert invoice_b is not None
    assert float(invoice_a.amount_due) == 5000
    assert float(invoice_b.amount_due) == 7000