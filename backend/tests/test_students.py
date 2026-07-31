import uuid

import pytest

from app.models.admission import Admission
from app.models.student import Student


async def _make_admission(db_session, tenant) -> Admission:
    a = Admission(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        admission_number=f"ADM-{uuid.uuid4().hex[:8]}",
        academic_year="2026-27",
        applied_course="NEET Bio-Chem",
        status="CONFIRMED",
    )
    db_session.add(a)
    await db_session.flush()
    return a


async def _make_student(db_session, tenant, admission, **overrides) -> Student:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        admission_id=admission.id,
        enrollment_no=f"ENR-{uuid.uuid4().hex[:8]}",
        first_name="Aarav",
        last_name="Sharma",
        is_active=True,
        subjects=[],
    )
    defaults.update(overrides)
    s = Student(**defaults)
    db_session.add(s)
    await db_session.flush()
    return s


@pytest.mark.asyncio
async def test_list_students_requires_auth(client, tenant):
    res = await client.get(
        "/api/v1/students/", headers={"X-Tenant-Subdomain": tenant.subdomain}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_students_rejects_student_role(client, db_session, tenant):
    """
    'student' role isn't in the allowed roles for list_students
    (owner, counselor, tutor only) — should be forbidden.
    """
    from tests.conftest import _make_user, make_access_token

    student_user = await _make_user(db_session, tenant, "student")
    token = make_access_token(student_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }
    res = await client.get("/api/v1/students/", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_list_students_returns_paginated_shape(client, owner_headers, db_session, tenant):
    admission = await _make_admission(db_session, tenant)
    await _make_student(db_session, tenant, admission)

    res = await client.get("/api/v1/students/", headers=owner_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    # service is expected to return pagination fields alongside the list;
    # exact keys depend on get_students' return shape — check the list is there
    assert any(isinstance(v, list) for v in body.values())


@pytest.mark.asyncio
async def test_get_student_by_id(client, owner_headers, db_session, tenant):
    admission = await _make_admission(db_session, tenant)
    student = await _make_student(db_session, tenant, admission)

    res = await client.get(f"/api/v1/students/{student.id}", headers=owner_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["id"] == str(student.id)
    assert body["data"]["enrollment_no"] == student.enrollment_no


@pytest.mark.asyncio
async def test_get_student_from_other_tenant_not_found(
    client, owner_headers, db_session, tenant
):
    """
    Cross-tenant isolation: a student belonging to a different tenant
    must not be retrievable via this tenant's owner token.
    """
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

    other_admission = await _make_admission(db_session, other_tenant)
    other_student = await _make_student(db_session, other_tenant, other_admission)

    res = await client.get(f"/api/v1/students/{other_student.id}", headers=owner_headers)
    assert res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_update_student_rejects_tutor(client, db_session, tenant):
    """
    update_student only allows owner/counselor — tutor should be forbidden
    even though tutor can view/list students.
    """
    from tests.conftest import _make_user, make_access_token

    admission = await _make_admission(db_session, tenant)
    student = await _make_student(db_session, tenant, admission)

    tutor_user = await _make_user(db_session, tenant, "tutor")
    token = make_access_token(tutor_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }

    res = await client.patch(
        f"/api/v1/students/{student.id}",
        json={"first_name": "Changed"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_student_changes_fields(client, owner_headers, db_session, tenant):
    admission = await _make_admission(db_session, tenant)
    student = await _make_student(db_session, tenant, admission, first_name="Original")

    res = await client.patch(
        f"/api/v1/students/{student.id}",
        json={"first_name": "Updated"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["first_name"] == "Updated"


@pytest.mark.asyncio
async def test_deactivate_student_requires_owner(client, db_session, tenant):
    """
    deactivate_student is owner-only — counselor should be forbidden.
    """
    from tests.conftest import _make_user, make_access_token

    admission = await _make_admission(db_session, tenant)
    student = await _make_student(db_session, tenant, admission)

    counselor_user = await _make_user(db_session, tenant, "counselor")
    token = make_access_token(counselor_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }

    res = await client.delete(f"/api/v1/students/{student.id}", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_deactivate_student_as_owner(client, owner_headers, db_session, tenant):
    admission = await _make_admission(db_session, tenant)
    student = await _make_student(db_session, tenant, admission)

    res = await client.delete(f"/api/v1/students/{student.id}", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True