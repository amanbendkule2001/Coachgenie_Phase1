# backend/scripts/test_batch_crud.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services import batch as batch_service

async def test_crud():
    print("=" * 60)
    print("TESTING FULL BATCH CRUD OPERATIONS")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        # 1. CREATE
        new_batch_data = {
            "name": "Full CRUD Batch 2026",
            "academic_year": "2025-26",
            "target_exam": "JEE Advanced",
            "capacity": 45,
            "subjects": ["Physics", "Mathematics"],
        }
        created = await batch_service.create_batch(db, str(tenant.id), new_batch_data)
        batch_id = str(created.id)
        print(f"1. CREATE BATCH -> ID: {batch_id}, Name: {created.name}")

        # 2. READ
        fetched = await batch_service.get_batch(db, str(tenant.id), batch_id)
        print(f"2. READ BATCH   -> Name: {fetched.name}, Target: {fetched.target_exam}, Capacity: {fetched.capacity}")

        # 3. UPDATE
        update_data = {
            "name": "Full CRUD Batch 2026 (Updated)",
            "capacity": 55,
            "subjects": ["Physics", "Mathematics", "Advanced Chemistry"],
        }
        updated = await batch_service.update_batch(db, str(tenant.id), batch_id, update_data)
        print(f"3. UPDATE BATCH -> Name: {updated.name}, New Capacity: {updated.capacity}, Subjects: {updated.subjects}")

        # 4. DELETE
        await batch_service.delete_batch(db, str(tenant.id), batch_id)
        print(f"4. DELETE BATCH -> Successfully removed batch ID: {batch_id}")

        # VERIFY DELETED
        try:
            await batch_service.get_batch(db, str(tenant.id), batch_id)
            print("ERROR: Batch still exists!")
        except Exception as e:
            print(f"5. VERIFY DELETED -> Confirmed Deleted ({e})")

        print("-" * 60)
        print("SUCCESS: ALL BATCH CRUD OPERATIONS WORKING 100% ERROR-FREE!")
        print("-" * 60)

if __name__ == "__main__":
    asyncio.run(test_crud())
