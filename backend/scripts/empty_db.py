import asyncio
from sqlalchemy import text
from app.database import engine

async def empty_all():
    print("\n[Emptying Database Data] Truncating all operational data...\n")
    async with engine.begin() as conn:
        tables = [
            "fee_payments",
            "fee_invoices",
            "attendance_records",
            "exam_results",
            "growth_cards",
            "ai_sessions",
            "batch_students",
            "students",
            "admissions",
            "lead_activities",
            "leads",
        ]
        for tbl in tables:
            try:
                await conn.execute(text(f"TRUNCATE TABLE {tbl} CASCADE;"))
                print(f"  [-] Cleared table: {tbl}")
            except Exception as e:
                print(f"  [!] Note: {e}")

    print("\nDatabase is now completely empty of student, lead, admission, and fee data!")
    print("You can now add fresh leads, admissions, students, and fees to test the application.")

if __name__ == "__main__":
    asyncio.run(empty_all())
