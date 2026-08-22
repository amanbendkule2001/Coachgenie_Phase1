# backend/scripts/test_batch_enrollment.py
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.student import Student
from app.models.batch import Batch, BatchStudent
from app.services import batch as batch_service

async def test_batch_enroll():
    print("=" * 60)
    print("TESTING BATCH STUDENT ASSIGNMENT & ACTIVE ROSTER ACCURACY")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        res_t = await db.execute(select(Tenant).where(Tenant.subdomain == "demo"))
        tenant = res_t.scalar_one()

        # Create or fetch batch
        res_b = await db.execute(select(Batch).where(and_(Batch.name == "Test Batch 101", Batch.tenant_id == tenant.id)))
        batch = res_b.scalar_one_or_none()
        if not batch:
            batch = Batch(tenant_id=tenant.id, name="Test Batch 101", academic_year="2025-26", capacity=30, is_active=True)
            db.add(batch)
            await db.commit()
            await db.refresh(batch)

        # Create Active Student
        res_s1 = await db.execute(select(Student).where(and_(Student.email == "active_test@demo.com", Student.tenant_id == tenant.id)))
        s1 = res_s1.scalar_one_or_none()
        if not s1:
            s1 = Student(tenant_id=tenant.id, enrollment_no="ENR-001", first_name="Active", last_name="Student", email="active_test@demo.com", is_active=True)
            db.add(s1)
            await db.commit()
            await db.refresh(s1)

        # Create Inactive Student
        res_s2 = await db.execute(select(Student).where(and_(Student.email == "inactive_test@demo.com", Student.tenant_id == tenant.id)))
        s2 = res_s2.scalar_one_or_none()
        if not s2:
            s2 = Student(tenant_id=tenant.id, enrollment_no="ENR-002", first_name="Inactive", last_name="Student", email="inactive_test@demo.com", is_active=False)
            db.add(s2)
            await db.commit()
            await db.refresh(s2)

        # Enroll Active Student
        try:
            await batch_service.enroll_student(db, str(tenant.id), str(batch.id), str(s1.id))
            print(f"1. Enrolled Active Student ({s1.first_name} {s1.last_name}) -> SUCCESS")
        except Exception as e:
            print(f"1. Enroll Active Student -> {e}")

        # Try enrolling Inactive Student (should fail)
        try:
            await batch_service.enroll_student(db, str(tenant.id), str(batch.id), str(s2.id))
            print("2. Enrolled Inactive Student -> ERROR: Allowed inactive student!")
        except Exception as e:
            print(f"2. Enrolled Inactive Student -> REJECTED PROPERLY: {e}")

        # Check roster & student count
        enrolled_students = await batch_service.get_batch_students(db, str(tenant.id), str(batch.id))
        print(f"3. Active Enrolled Students Count: {len(enrolled_students)}")

        b_updated = await batch_service.get_batch(db, str(tenant.id), str(batch.id))
        print(f"4. Batch student_ids count: {len(b_updated.student_ids)} / {b_updated.capacity}")

        if len(enrolled_students) == 1 and len(b_updated.student_ids) == 1:
            print("-" * 60)
            print("PASSED: Assign Student works error-free & shows accurate active roster!")
            print("-" * 60)
        else:
            print("FAILED!")

if __name__ == "__main__":
    asyncio.run(test_batch_enroll())
