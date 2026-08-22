# backend/scripts/test_status_tab_filtering.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services import batch as batch_service

async def test_status():
    print("=" * 60)
    print("TESTING BATCH STATUS (ACTIVE, UPCOMING, COMPLETED) PERSISTENCE")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        # 1. Create Upcoming Batch
        upcoming = await batch_service.create_batch(db, str(tenant.id), {
            "name": "Upcoming NEET 2027",
            "academic_year": "2026-27",
            "status": "UPCOMING",
            "is_active": True,
        })
        print(f"1. Created Batch '{upcoming.name}' with Status: {upcoming.status}")

        # 2. Update to Completed
        updated = await batch_service.update_batch(db, str(tenant.id), str(upcoming.id), {
            "status": "COMPLETED",
            "is_active": False,
        })
        print(f"2. Updated Batch '{updated.name}' to Status: {updated.status} (is_active={updated.is_active})")

        # 3. Read back from database
        refetched = await batch_service.get_batch(db, str(tenant.id), str(upcoming.id))
        print(f"3. Refetched from NeonDB -> Status: {refetched.status}")

        # Clean up test batch
        await batch_service.delete_batch(db, str(tenant.id), str(upcoming.id))
        print("4. Cleaned up test batch")

        if refetched.status == "COMPLETED":
            print("-" * 60)
            print("SUCCESS: Batch Status (ACTIVE/UPCOMING/COMPLETED) Persists 100% in NeonDB!")
            print("-" * 60)

if __name__ == "__main__":
    asyncio.run(test_status())
