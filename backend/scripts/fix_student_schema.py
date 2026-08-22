# backend/scripts/fix_student_schema.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def fix_schema():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE students ALTER COLUMN admission_id DROP NOT NULL;"))
        await db.commit()
        print("Schema updated: admission_id is now nullable in NeonDB.")

if __name__ == "__main__":
    asyncio.run(fix_schema())
