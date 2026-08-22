# backend/scripts/setup_test_institutes.py
import asyncio
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.security import hash_password

INSTITUTES = [
    {
        "name": "Demo Coaching Institute",
        "subdomain": "demo",
        "email": "owner@demo.com",
        "first_name": "Demo",
        "last_name": "Owner",
        "password": "Admin@1234",
        "plan": "enterprise",
    },
    {
        "name": "Apex Career Academy",
        "subdomain": "apex",
        "email": "owner@apex.com",
        "first_name": "Apex",
        "last_name": "Owner",
        "password": "Admin@1234",
        "plan": "pro",
    },
    {
        "name": "Pioneer Science Classes",
        "subdomain": "pioneer",
        "email": "owner@pioneer.com",
        "first_name": "Pioneer",
        "last_name": "Owner",
        "password": "Admin@1234",
        "plan": "basic",
    },
]

async def create_institutes():
    print("=" * 60)
    print("PROVISIONING MULTI-TENANT INSTITUTES IN NEONDB")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        for inst in INSTITUTES:
            # 1. Check/Create Tenant
            res_t = await db.execute(select(Tenant).where(Tenant.subdomain == inst["subdomain"]))
            tenant = res_t.scalar_one_or_none()
            if not tenant:
                tenant = Tenant(
                    name=inst["name"],
                    subdomain=inst["subdomain"],
                    plan=inst["plan"],
                    is_active=True,
                    settings={"theme": "blue", "locale": "en-IN"},
                )
                db.add(tenant)
                await db.flush()
                print(f"[CREATED TENANT] {inst['name']} (Subdomain: {inst['subdomain']})")
            else:
                print(f"[EXISTS TENANT]  {inst['name']} (Subdomain: {inst['subdomain']})")

            # 2. Check/Create Admin User
            res_u = await db.execute(select(User).where(User.email == inst["email"]))
            user = res_u.scalar_one_or_none()
            hashed_pwd = hash_password(inst["password"])
            if not user:
                user = User(
                    tenant_id=tenant.id,
                    email=inst["email"],
                    password_hash=hashed_pwd,
                    first_name=inst["first_name"],
                    last_name=inst["last_name"],
                    role="owner",
                    is_active=True,
                )
                db.add(user)
                print(f"  |- [CREATED USER]  {inst['email']}")
            else:
                user.tenant_id = tenant.id
                user.password_hash = hashed_pwd
                user.is_active = True
                print(f"  |- [UPDATED USER]  {inst['email']}")

        await db.commit()
    print("=" * 60)
    print("SUCCESS: 3 Institutes Ready in NeonDB!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(create_institutes())
