# backend/scripts/test_batch_code_display.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services import batch as batch_service

async def test_code():
    print("=" * 60)
    print("TESTING BATCH CODE PERSISTENCE & API RETURN")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        created = await batch_service.create_batch(db, str(tenant.id), {
            "name": "Physics Super 30",
            "code": "PHY-S30",
            "academic_year": "2025-26",
            "target_exam": "JEE Advanced",
        })
        print(f"1. Created Batch '{created.name}' with Batch Code: '{created.code}'")

        fetched = await batch_service.get_batch(db, str(tenant.id), str(created.id))
        print(f"2. Fetched from NeonDB -> Batch Code: '{fetched.code}'")

        await batch_service.delete_batch(db, str(tenant.id), str(created.id))
        print("3. Cleaned up test batch.")

        if fetched.code == "PHY-S30":
            print("-" * 60)
            print("PASSED: Batch Code (code) Persists and returns 100% cleanly!")
            print("-" * 60)

if __name__ == "__main__":
    asyncio.run(test_code())
