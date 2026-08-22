# backend/scripts/test_initial_fee_payment_sync.py
import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.student import Student
from app.models.admission import Admission
from app.services import admission as admission_service
from app.services import fee as fee_service

async def test_fee_sync():
    print("=" * 60)
    print("TESTING INITIAL FEE PAYMENT DATABASE PERSISTENCE & HISTORY LEDGER")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        adm_no = f"ADM-TEST-{int(asyncio.get_event_loop().time())}"

        # 1. Create Admission with Initial Payment
        import json
        adm = Admission(
            tenant_id=tenant.id,
            admission_number=adm_no,
            academic_year="2025-26",
            applied_course="10th CBSE Board",
            student_name="Rahul Gupta",
            email="rahul.gupta@demo.com",
            phone="9876543210",
            fee_amount=20000.0,
            fee_paid=7500.0,
            payment_installment_schedule=json.dumps({"modeOfPayment": "UPI", "dateOfPayment": date.today().isoformat()}),
            status="confirmed",
        )
        db.add(adm)
        await db.commit()
        await db.refresh(adm)

        print(f"1. Created Admission '{adm.admission_number}' with Fee Amount: INR {adm.fee_amount}, Initial Fee Paid: INR {adm.fee_paid}")

        # 2. Generate/Sync Student and Invoice/Payment
        student = await admission_service.generate_student_from_admission(db, adm)
        await db.commit()

        print(f"2. Generated Student '{student.first_name} {student.last_name}' (ID: {student.id})")

        # 3. Query Payment History Ledger for Tenant
        history = await fee_service.get_all_payments_for_tenant(db, str(tenant.id))
        print(f"3. Total Payment History Transactions Returned: {len(history)}")

        initial_pay = next((p for p in history if p["student_id"] == str(student.id)), None)
        if initial_pay:
            print("   Initial Fee Payment Record Found in History Ledger:")
            print(f"   - Day & Date: {initial_pay['day_of_week']}, {initial_pay['formatted_date']}")
            print(f"   - Invoice / Receipt #: {initial_pay['invoice_no']} ({initial_pay['transaction_ref']})")
            print(f"   - Payment Mode: {initial_pay['payment_mode']}")
            print(f"   - Amount Paid: INR {initial_pay['amount']}")
            print(f"   - Status: {initial_pay['status']}")

        # 4. Record Incremental Fee Payment
        invoices = await fee_service.get_student_invoices(db, str(tenant.id), str(student.id))
        if invoices:
            inv = invoices[0]
            new_pay = await fee_service.record_payment(db, str(tenant.id), str(inv.id), str(tenant.id), {
                "amount": 5000.0,
                "payment_mode": "cash",
                "transaction_ref": "REC-CASH-102",
                "notes": "Second installment cash payment",
            })
            await db.commit()

            print(f"4. Recorded Incremental Payment: INR {new_pay.amount} via CASH")

            # Refetch updated student and payment history
            refreshed_history = await fee_service.get_all_payments_for_tenant(db, str(tenant.id), str(student.id))
            print(f"5. Updated Student Payment History Records Count: {len(refreshed_history)}")

        # Clean up test objects
        await db.delete(adm)
        await db.delete(student)
        await db.commit()
        print("6. Cleaned up test admission and student.")

        if initial_pay and len(refreshed_history) == 2:
            print("-" * 60)
            print("SUCCESS: Initial Fee Payments Save to DB & Synchronize Across All Modules!")
            print("-" * 60)

if __name__ == "__main__":
    asyncio.run(test_fee_sync())
