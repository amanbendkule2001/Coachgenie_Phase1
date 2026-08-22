# backend/scripts/test_batch_code_update.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services import batch as batch_service

async def test_update_code():
    print("=" * 60)
    print("TESTING BATCH CODE UPDATE VIA API & SERVICE")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        # 1. Create Batch with initial code
        b = await batch_service.create_batch(db, str(tenant.id), {
            "name": "Code Update Test Batch",
            "code": "OLD-CODE-001",
            "academic_year": "2025-26",
        })
        print(f"1. Created Batch '{b.name}' with Initial Code: '{b.code}'")

        # 2. Update Batch Code to NEW-CODE-999
        updated = await batch_service.update_batch(db, str(tenant.id), str(b.id), {
            "code": "NEW-CODE-999",
        })
        print(f"2. Updated Batch Code -> '{updated.code}'")

        # 3. Refetch from DB to verify persistence
        refetched = await batch_service.get_batch(db, str(tenant.id), str(b.id))
        print(f"3. Refetched from NeonDB -> Batch Code: '{refetched.code}'")

        await batch_service.delete_batch(db, str(tenant.id), str(b.id))
        print("4. Cleaned up test batch.")

        if refetched.code == "NEW-CODE-999":
            print("-" * 60)
            print("PASSED: Batch Code Updates 100% Error-Free & Persists in NeonDB!")
            print("-" * 60)
        else:
            print("FAILED: Code did not update!")

if __name__ == "__main__":
    asyncio.run(test_update_code())
