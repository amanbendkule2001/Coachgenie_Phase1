import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding missing status column to batches table if not exists...")
        await conn.execute(text("ALTER TABLE batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';"))
        print("Successfully altered batches table!")

if __name__ == "__main__":
    asyncio.run(main())
