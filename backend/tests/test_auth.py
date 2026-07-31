import uuid

import pytest

from app.models.user import User
from app.utils.security import hash_password


def _register_body(email=None, password="Str0ngPass!23"):
    return {
        "email": email or f"user-{uuid.uuid4().hex[:8]}@example.com",
        "password": password,
        "first_name": "Test",
        "last_name": "User",
    }


async def _register(client, tenant, email=None, password="Str0ngPass!23"):
    body = _register_body(email, password)
    res = await client.post(
        "/api/v1/auth/register",
        json=body,
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    return res, body


async def _login(client, tenant, email, password):
    return await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )


# ── Register ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_creates_user(client, tenant):
    res, body = await _register(client, tenant)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["email"] == body["email"]
    assert data["role"] == "student"  # register_user hardcodes role="student"


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(client, tenant):
    res1, body = await _register(client, tenant)
    assert res1.status_code == 201

    res2, _ = await _register(client, tenant, email=body["email"])
    # ConflictError -- adjust this status code if your exception handler
    # maps ConflictError to something other than 409.
    assert res2.status_code == 409


@pytest.mark.asyncio
async def test_register_same_email_different_tenant_allowed(client, tenant, db_session):
    from app.models.tenant import Tenant

    other_tenant = Tenant(
        id=uuid.uuid4(),
        name="Other Tenant",
        subdomain=f"other-{uuid.uuid4().hex[:8]}",
        plan="basic",
        is_active=True,
        settings={},
    )
    db_session.add(other_tenant)
    await db_session.flush()

    res1, body = await _register(client, tenant)
    assert res1.status_code == 201

    res2, _ = await _register(client, other_tenant, email=body["email"])
    assert res2.status_code == 201


# ── Login ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success_returns_tokens_and_user(client, tenant):
    _, body = await _register(client, tenant)
    res = await _login(client, tenant, body["email"], body["password"])

    assert res.status_code == 200
    data = res.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == body["email"]


@pytest.mark.asyncio
async def test_login_wrong_password_rejected(client, tenant):
    _, body = await _register(client, tenant)
    res = await _login(client, tenant, body["email"], "wrong-password")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_rejected(client, tenant):
    res = await _login(client, tenant, "nobody@example.com", "whatever")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user_rejected(client, tenant, db_session):
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="inactive@example.com",
        password_hash=hash_password("Str0ngPass!23"),
        first_name="Inactive",
        last_name="User",
        role="student",
        is_active=False,
    )
    db_session.add(user)
    await db_session.flush()

    res = await _login(client, tenant, "inactive@example.com", "Str0ngPass!23")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_tenant_rejected(client, tenant, db_session):
    """A user registered under one tenant can't log in via another tenant's subdomain."""
    from app.models.tenant import Tenant

    other_tenant = Tenant(
        id=uuid.uuid4(),
        name="Other Tenant",
        subdomain=f"other-{uuid.uuid4().hex[:8]}",
        plan="basic",
        is_active=True,
        settings={},
    )
    db_session.add(other_tenant)
    await db_session.flush()

    _, body = await _register(client, tenant)
    res = await _login(client, other_tenant, body["email"], body["password"])
    assert res.status_code == 401


# ── Refresh ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_rotates_tokens(client, tenant):
    _, body = await _register(client, tenant)
    login_res = await _login(client, tenant, body["email"], body["password"])
    old_refresh = login_res.json()["refresh_token"]

    res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert res.status_code == 200
    new_tokens = res.json()
    assert new_tokens["access_token"]
    assert new_tokens["refresh_token"]
    assert new_tokens["refresh_token"] != old_refresh


@pytest.mark.asyncio
async def test_refresh_with_used_token_rejected(client, tenant):
    """Old refresh token must be revoked once it's been rotated."""
    _, body = await _register(client, tenant)
    login_res = await _login(client, tenant, body["email"], body["password"])
    old_refresh = login_res.json()["refresh_token"]

    first = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert first.status_code == 200

    # reusing the same (now-rotated) refresh token must fail
    second = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert second.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_garbage_token_rejected(client, tenant):
    res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "not-a-real-token"},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert res.status_code == 401


# ── Logout ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client, tenant):
    _, body = await _register(client, tenant)
    login_res = await _login(client, tenant, body["email"], body["password"])
    refresh = login_res.json()["refresh_token"]

    logout_res = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # token must no longer work for refresh
    res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_logout_with_unknown_token_is_a_no_op(client, tenant):
    """logout_user silently no-ops on an unknown token hash -- confirm that
    doesn't error out rather than assuming it 404s."""
    res = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": "never-issued-token"},
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert res.status_code == 200


# ── Me ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_requires_auth(client, tenant):
    res = await client.get(
        "/api/v1/auth/me", headers={"X-Tenant-Subdomain": tenant.subdomain}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client, tenant):
    _, body = await _register(client, tenant)
    login_res = await _login(client, tenant, body["email"], body["password"])
    access_token = login_res.json()["access_token"]

    res = await client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Tenant-Subdomain": tenant.subdomain,
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["email"] == body["email"]