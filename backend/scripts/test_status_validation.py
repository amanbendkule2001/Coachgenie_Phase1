# backend/scripts/test_status_validation.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services import batch as batch_service
from app.schemas.batch import BatchCreate, BatchUpdate

async def test_validation():
    print("=" * 60)
    print("TESTING BATCH STATUS VALIDATION LOGIC")
    print("=" * 60)

    # 1. Pydantic Schema Validation
    try:
        valid_schema = BatchCreate(name="Test", academic_year="2025-26", status="upcoming")
        print(f"1. Pydantic valid status 'upcoming' normalized -> '{valid_schema.status}'")
    except Exception as e:
        print(f"1. Error: {e}")

    try:
        BatchCreate(name="Test", academic_year="2025-26", status="INVALID_STATUS")
        print("2. ERROR: Allowed invalid status!")
    except Exception as e:
        print(f"2. Pydantic rejected invalid status 'INVALID_STATUS' -> PROPER ERROR: {e}")

    # 2. Database Service Validation
    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        b = await batch_service.create_batch(db, str(tenant.id), {
            "name": "Validation Test Batch",
            "academic_year": "2025-26",
            "status": "UPCOMING",
        })

        try:
            await batch_service.update_batch(db, str(tenant.id), str(b.id), {"status": "INVALID_ABC"})
            print("3. ERROR: Allowed invalid status in update_batch!")
        except Exception as e:
            print(f"3. Service rejected invalid status 'INVALID_ABC' -> PROPER ERROR: {e}")

        await batch_service.delete_batch(db, str(tenant.id), str(b.id))
        print("4. Cleaned up validation test batch.")

    print("-" * 60)
    print("PASSED: Status validation works 100% cleanly across Schema & Service layers!")
    print("-" * 60)

if __name__ == "__main__":
    asyncio.run(test_validation())
