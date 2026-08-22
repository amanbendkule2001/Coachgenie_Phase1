import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        # Tables
        tables = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
        print("\n=== ALL DATABASE TABLES ===")
        print([r[0] for r in tables])

        # Tenants
        tenants = await db.execute(text("SELECT id, name, subdomain, plan, is_active FROM tenants"))
        t_dict = {str(t["id"]): dict(t) for t in tenants.mappings()}

        # Users
        users = await db.execute(text("SELECT id, tenant_id, email, role, first_name, last_name, phone, is_active, last_login_at FROM users"))
        print("\n=== SYSTEM USERS (ADMIN/STAFF/TUTOR ACCOUNTS) ===")
        for u in users.mappings():
            ud = dict(u)
            t_info = t_dict.get(str(ud["tenant_id"]), {})
            t_name = t_info.get("name", "Unknown")
            t_sub = t_info.get("subdomain", "Unknown")
            print(f"Role: {ud['role']:<10} | Name: {ud['first_name'] + ' ' + ud['last_name']:<20} | Email: {ud['email']:<25} | Tenant: {t_name} ({t_sub}) | Active: {ud['is_active']} | Phone: {ud['phone']}")

        # Students with batches
        students = await db.execute(text("""
            SELECT s.id, s.enrollment_no, s.first_name, s.last_name, s.email, s.phone, s.school_name, 
                   s.current_class, s.target_exam, s.parent_name, s.parent_phone, s.is_active, s.joined_at,
                   b.name as batch_name, a.admission_number, a.fee_amount, a.fee_paid
            FROM students s
            LEFT JOIN batch_students bs ON bs.student_id = s.id
            LEFT JOIN batches b ON b.id = bs.batch_id
            LEFT JOIN admissions a ON a.id = s.admission_id
        """))
        print("\n=== STUDENTS ENROLLED (DETAILS & BATCHES) ===")
        for s in students.mappings():
            sd = dict(s)
            print(f"Enrollment: {sd['enrollment_no']:<14} | Name: {sd['first_name'] + ' ' + sd['last_name']:<20} | Email: {sd['email']:<25} | Phone: {sd['phone']} | Class: {sd['current_class']} | Batch: {str(sd['batch_name']):<15} | Admission: {sd['admission_number']} | Fee Paid: {sd['fee_paid']}/{sd['fee_amount']}")

        # Leads
        leads = await db.execute(text("SELECT id, full_name, email, phone, status, interested_course, grade, school_name, parent_name FROM leads"))
        print("\n=== LEADS (PROSPECTIVE STUDENTS) ===")
        for l in leads.mappings():
            ld = dict(l)
            print(f"Name: {ld['full_name']:<20} | Email: {ld['email']:<25} | Phone: {ld['phone']} | Status: {ld['status']:<12} | Course: {ld['interested_course']} | Parent: {ld['parent_name']}")

asyncio.run(check())