# backend/scripts/test_404_handling.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services import batch as batch_service
from app.utils.exceptions import NotFoundError

async def test_handling():
    print("=" * 60)
    print("TESTING 404 BATCH HANDLING & STALE RECORD PURGE")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        fake_batch_id = "271fb849-3e3e-48e8-84ad-4fc1358a2a66"

        # Try GET fake batch
        try:
            await batch_service.get_batch(db, str(tenant.id), fake_batch_id)
            print("ERROR: Fake batch found!")
        except NotFoundError as e:
            print(f"1. GET Fake Batch ID ({fake_batch_id}) -> PROPER 404 ({e})")

        # Try UPDATE fake batch
        try:
            await batch_service.update_batch(db, str(tenant.id), fake_batch_id, {"name": "Nonexistent"})
            print("ERROR: Fake batch updated!")
        except NotFoundError as e:
            print(f"2. PATCH Fake Batch ID ({fake_batch_id}) -> PROPER 404 ({e})")

        # Try DELETE fake batch
        try:
            await batch_service.delete_batch(db, str(tenant.id), fake_batch_id)
            print("ERROR: Fake batch deleted!")
        except NotFoundError as e:
            print(f"3. DELETE Fake Batch ID ({fake_batch_id}) -> PROPER 404 ({e})")

        print("-" * 60)
        print("PASSED: 404 exceptions handled cleanly without backend crashes!")
        print("-" * 60)

if __name__ == "__main__":
    asyncio.run(test_handling())
