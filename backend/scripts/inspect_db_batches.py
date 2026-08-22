# backend/scripts/inspect_db_batches.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.batch import Batch

async def inspect():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Batch, Tenant).join(Tenant, Tenant.id == Batch.tenant_id))
        rows = res.all()
        print("=" * 60)
        print(f"EXISTING BATCHES IN NEONDB: {len(rows)}")
        print("=" * 60)
        for batch, tenant in rows:
            print(f"ID: {batch.id} | Name: {batch.name} | Subdomain: {tenant.subdomain}")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(inspect())
