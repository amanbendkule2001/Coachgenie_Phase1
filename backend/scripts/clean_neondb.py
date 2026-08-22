import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

NEON_URL = "postgresql+asyncpg://neondb_owner:npg_NGBUAye5nr2I@ep-soft-sea-aok3ljdv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

OPERATIONAL_TABLES = [
    "fee_payments",
    "fee_invoices",
    "fee_structures",
    "attendance_records",
    "attendance_sessions",
    "exam_results",
    "exams",
    "growth_cards",
    "ai_messages",
    "ai_sessions",
    "ai_embeddings",
    "ai_agent_runs",
    "ai_feedback",
    "ai_generated_reports",
    "ai_logs",
    "dashboard_snapshots",
    "batch_students",
    "classes",
    "batches",
    "subjects",
    "students",
    "admissions",
    "lead_activities",
    "leads",
    "syllabus_progress",
    "syllabus_items",
    "inbox_notifications",
    "notification_logs",
    "notification_templates",
    "otp_codes",
    "otp_verifications",
    "refresh_tokens",
    "chats",
    "messages",
    "knowledge_chunks",
    "user_profiles",
]

async def clean_neondb():
    print("\n[NeonDB Cleanup] Truncating all operational test data from NeonDB...\n")
    engine = create_async_engine(NEON_URL)

    async with engine.begin() as conn:
        # 1. Truncate operational tables
        for tbl in OPERATIONAL_TABLES:
            try:
                await conn.execute(text(f'TRUNCATE TABLE "{tbl}" CASCADE;'))
                print(f"  [-] Cleared table: {tbl}")
            except Exception as e:
                print(f"  [!] Note clearing {tbl}: {e}")

        # 2. Truncate users and tenants
        await conn.execute(text('TRUNCATE TABLE "users" CASCADE;'))
        await conn.execute(text('TRUNCATE TABLE "tenants" CASCADE;'))
        print("  [-] Cleared users and tenants tables")

        # 3. Create fresh default Demo Tenant
        tenant_id = "104e64da-797a-4e81-abee-e14d4f52aa27"
        await conn.execute(text("""
            INSERT INTO tenants (id, name, subdomain, plan, is_active, settings, created_at, updated_at)
            VALUES (
                :id, 'Demo Coaching Institute', 'demo', 'pro', true, '{"theme": "blue", "locale": "en-IN"}'::jsonb, NOW(), NOW()
            );
        """), {"id": tenant_id})
        print(f"  [+] Recreated base demo tenant: Demo Coaching Institute (subdomain: demo)")

        # 4. Create fresh base users with password 'Admin@1234'
        admin_pw_hash = pwd_context.hash("Admin@1234")
        users_data = [
            {"id": "9dc14449-f587-42e1-accb-3bb7b80ac6bd", "email": "owner@demo.com",      "role": "owner",      "first": "Demo",   "last": "Owner"},
            {"id": "43413b65-b811-46d3-93f3-1aaf74de29bc", "email": "counselor@demo.com",  "role": "counselor",  "first": "Priya",  "last": "Sharma"},
            {"id": "4dd15749-702a-4aa9-ab22-535df7dff7ea", "email": "tutor@demo.com",      "role": "tutor",      "first": "Rahul",  "last": "Verma"},
        ]
        for u in users_data:
            await conn.execute(text("""
                INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at)
                VALUES (
                    :id, :tenant_id, :email, :password_hash, :role, :first_name, :last_name, true, NOW(), NOW()
                );
            """), {
                "id": u["id"],
                "tenant_id": tenant_id,
                "email": u["email"],
                "password_hash": admin_pw_hash,
                "role": u["role"],
                "first_name": u["first"],
                "last_name": u["last"],
            })
            print(f"  [+] Recreated base user: {u['email']} ({u['role']})")

    # 5. Row count verification
    print("\n--- NeonDB Verification Summary ---")
    async with engine.connect() as conn:
        tbls_res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"))
        tables = [r[0] for r in tbls_res.fetchall()]
        for tbl in tables:
            count_res = await conn.execute(text(f'SELECT COUNT(*) FROM "{tbl}";'))
            cnt = count_res.scalar()
            if cnt > 0 or tbl in ["tenants", "users", "students", "leads", "admissions"]:
                print(f"  - {tbl}: {cnt} rows")

    await engine.dispose()
    print("\nNeonDB successfully reset to clean state!")
    print("=" * 60)
    print("  Subdomain: demo")
    print("  Admin Credentials: owner@demo.com / Admin@1234")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(clean_neondb())
