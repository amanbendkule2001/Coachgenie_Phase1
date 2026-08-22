# backend/scripts/verify_tenant_isolation.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.student import Student

async def test_isolation():
    print("=" * 60)
    print("VERIFYING TENANT DATA ISOLATION IN NEONDB")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # Get demo tenant & apex tenant
        res_demo = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        demo = res_demo.scalar_one()

        res_apex = await db.execute(select(Tenant).where(Tenant.subdomain == "apex"))
        apex = res_apex.scalar_one()

        # Add a test student specifically to 'demo'
        test_student = Student(
            tenant_id=demo.id,
            enrollment_no="ENR-TEST-001",
            first_name="Isolated",
            last_name="DemoStudent",
            current_class="10th",
            email="isolated@demo.com",
            phone="9998887770",
        )
        db.add(test_student)
        await db.commit()
        print(f"1. Created student 'Isolated DemoStudent' for Tenant 'Demo Coaching Institute' (ID: {demo.id})")

        # Query students for Demo
        demo_count = await db.scalar(select(func.count()).select_from(Student).where(Student.tenant_id == demo.id))
        print(f"2. Querying Demo Tenant Students  -> Found: {demo_count} student(s)")

        # Query students for Apex
        apex_count = await db.scalar(select(func.count()).select_from(Student).where(Student.tenant_id == apex.id))
        print(f"3. Querying Apex Tenant Students  -> Found: {apex_count} student(s)")

        # Clean up test student
        await db.delete(test_student)
        await db.commit()

        if apex_count == 0 and demo_count == 1:
            print("-" * 60)
            print("ISOLATION PASSED: Apex Tenant CANNOT see Demo Tenant's data!")
            print("-" * 60)
        else:
            print("ISOLATION FAILED!")

if __name__ == "__main__":
    asyncio.run(test_isolation())
