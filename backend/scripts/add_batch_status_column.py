# backend/scripts/add_batch_status_column.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def migrate():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';"))
        await db.commit()
        print("MIGRATION SUCCESS: Added 'status' column to batches table in NeonDB!")

if __name__ == "__main__":
    asyncio.run(migrate())
