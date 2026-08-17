import asyncio
import os
from sqlalchemy import text
from passlib.context import CryptContext

from app.database import engine, AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from app.models.batch import Batch
from sqlalchemy import select

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_database():
    print("\n[Resetting Database] Clearing all operational data...\n")

    async with engine.begin() as conn:
        # Truncate transactional tables in cascade
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
                print(f"  [-] Truncated table: {tbl}")
            except Exception as e:
                print(f"  [!] Skip/Error truncating {tbl}: {e}")

    async with AsyncSessionLocal() as db:
        # Ensure base demo tenant exists
        res = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                name="Demo Coaching Institute",
                subdomain="demo",
                plan="pro",
                is_active=True,
                settings={"theme": "blue", "locale": "en-IN"},
            )
            db.add(tenant)
            await db.flush()
            print(f"  [+] Created demo tenant: {tenant.name}")

        # Ensure base users exist
        users_data = [
            {"email": "owner@demo.com",      "role": "owner",      "first": "Demo",   "last": "Owner"},
            {"email": "counselor@demo.com",  "role": "counselor",  "first": "Priya",  "last": "Sharma"},
            {"email": "tutor@demo.com",      "role": "tutor",      "first": "Rahul",  "last": "Verma"},
        ]
        for u in users_data:
            res = await db.execute(select(User).where(User.email == u["email"], User.tenant_id == tenant.id))
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    tenant_id=tenant.id,
                    email=u["email"],
                    password_hash=pwd_context.hash("Admin@1234"),
                    role=u["role"],
                    first_name=u["first"],
                    last_name=u["last"],
                    is_active=True,
                )
                db.add(user)
                await db.flush()
                print(f"  [+] Created user: {u['email']} ({u['role']})")

        # Ensure base batch exists
        res = await db.execute(select(Batch).where(Batch.name == "JEE 2026", Batch.tenant_id == tenant.id))
        batch = res.scalar_one_or_none()
        if not batch:
            from datetime import date
            batch = Batch(
                tenant_id=tenant.id,
                name="JEE 2026",
                code="JEE26",
                target_exam="JEE Main & Advanced",
                academic_year="2025-26",
                start_date=date(2025, 6, 1),
                end_date=date(2026, 5, 31),
                capacity=60,
                is_active=True,
            )
            db.add(batch)
            await db.flush()
            print(f"  [+] Created batch: {batch.name}")

        await db.commit()

    print("\nDatabase reset complete!")
    print("-" * 50)
    print("  Status: Clean DB state (0 Leads, 0 Admissions, 0 Students, 0 Invoices)")
    print("  Login: owner@demo.com / Admin@1234")
    print("-" * 50)

if __name__ == "__main__":
    asyncio.run(reset_database())
