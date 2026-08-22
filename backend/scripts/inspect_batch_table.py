# backend/scripts/inspect_batch_table.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def inspect_table():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'batches';"))
        cols = res.all()
        print("=" * 60)
        print("NEONDB BATCHES COLUMNS:")
        print("=" * 60)
        for col, dtype in cols:
            print(f" - {col} ({dtype})")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(inspect_table())
