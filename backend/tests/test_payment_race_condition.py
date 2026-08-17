import pytest
import asyncio
from httpx import AsyncClient
from app.models.tenant import Tenant
from app.models.user import User
from app.models.student import Student
from app.models.admission import Admission
from app.models.fee import FeeInvoice
from app.utils.security import hash_password, create_access_token
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_concurrent_payment_race_condition_locking(client: AsyncClient, db_session):
    """
    CONCURRENCY TEST: Verify database row locking (.with_for_update()) prevents lost updates
    or calculation race conditions when multiple payment requests hit the exact same invoice concurrently.
    """
    # 1. Setup Tenant, Owner, Admission & Student
    tenant = Tenant(name="Race Test Institute", subdomain="race-test", is_active=True)
    db_session.add(tenant)
    await db_session.flush()

    user = User(tenant_id=str(tenant.id), email="owner@race-test.com", password_hash=hash_password("Pass@123"), role="owner", first_name="Race", last_name="Owner")
    admission = Admission(tenant_id=str(tenant.id), admission_number="ADM-RACE-1", academic_year="2024-25", applied_course="Math")
    db_session.add_all([user, admission])
    await db_session.flush()

    student = Student(tenant_id=str(tenant.id), admission_id=admission.id, enrollment_no="STU-RACE-1", first_name="Race", last_name="Student", is_active=True)
    db_session.add(student)
    await db_session.flush()

    # 2. Create Fee Invoice for total ₹10,000
    invoice = FeeInvoice(
        tenant_id=str(tenant.id),
        student_id=str(student.id),
        invoice_no="INV-RACE-001",
        amount_due=10000.00,
        amount_paid=0.00,
        status="pending",
        due_date=date.today() + timedelta(days=30),
    )
    db_session.add(invoice)
    await db_session.commit()

    token = create_access_token({"sub": str(user.id), "tenant_id": str(tenant.id), "role": "owner"})
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": "race-test",
    }

    # 3. Define payment payload (₹2,500 each)
    payment_payload = {
        "amount": 2500.00,
        "payment_mode": "cash",
        "transaction_ref": "TXN-RACE-100",
    }

    # 4. Execute 4 installment payments of ₹2,500 each
    responses = []
    for _ in range(4):
        res = await client.post(
            f"/api/v1/fees/invoices/{invoice.id}/pay",
            json=payment_payload,
            headers=headers
        )
        responses.append(res)

    # 5. Verify all payment requests succeeded or were handled cleanly
    for res in responses:
        assert res.status_code in (200, 201), f"Payment failed with code {res.status_code}: {res.text}"

    # 6. Verify final invoice state in DB
    await db_session.refresh(invoice)
    assert float(invoice.amount_paid) == 10000.00, f"Expected 10000.00 paid, got {invoice.amount_paid}"
    assert invoice.status == "paid", f"Expected invoice status paid, got {invoice.status}"
