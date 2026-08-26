import uuid

import pytest

from app.models.batch import Batch, Subject
from app.models.tenant import Tenant


async def _make_batch(db_session, tenant, **overrides) -> Batch:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="NEET Bio-Chem",
        academic_year="2026-27",
        capacity=50,
        is_active=True,
        schedule=[],
        subjects=[],
    )
    defaults.update(overrides)
    b = Batch(**defaults)
    db_session.add(b)
    await db_session.flush()
    return b


async def _make_subject(db_session, tenant, **overrides) -> Subject:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name=f"Biology-{uuid.uuid4().hex[:6]}",
    )
    defaults.update(overrides)
    s = Subject(**defaults)
    db_session.add(s)
    await db_session.flush()
    return s


# ── List / Create batches ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_batches_requires_auth(client, tenant):
    res = await client.get(
        "/api/v1/batches/", headers={"X-Tenant-Subdomain": tenant.subdomain}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_batches_as_owner(client, owner_headers, db_session, tenant):
    await _make_batch(db_session, tenant)
    res = await client.get("/api/v1/batches/", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_create_batch_rejects_student(client, db_session, tenant):
    from tests.conftest import _make_user, make_access_token
    student_user = await _make_user(db_session, tenant, "student")
    token = make_access_token(student_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }
    res = await client.post(
        "/api/v1/batches/",
        json={"name": "New Batch", "academic_year": "2026-27"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_batch_as_owner(client, owner_headers):
    res = await client.post(
        "/api/v1/batches/",
        json={"name": "New Batch", "academic_year": "2026-27", "capacity": 30},
        headers=owner_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    assert body["data"]["name"] == "New Batch"
    assert body["data"]["capacity"] == 30


# ── Get / Update single batch ──────────────────────────────────────


@pytest.mark.asyncio
async def test_get_batch_by_id(client, owner_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    res = await client.get(f"/api/v1/batches/{batch.id}", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["data"]["id"] == str(batch.id)


@pytest.mark.asyncio
async def test_get_batch_from_other_tenant_not_found(client, owner_headers, db_session, tenant):
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
    other_batch = await _make_batch(db_session, other_tenant)

    res = await client.get(f"/api/v1/batches/{other_batch.id}", headers=owner_headers)
    assert res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_update_batch_rejects_student(client, db_session, tenant):
    from tests.conftest import _make_user, make_access_token
    batch = await _make_batch(db_session, tenant)
    student_user = await _make_user(db_session, tenant, "student")
    token = make_access_token(student_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }
    res = await client.patch(
        f"/api/v1/batches/{batch.id}",
        json={"name": "Renamed"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_batch_as_owner(client, owner_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant, name="Original")
    res = await client.patch(
        f"/api/v1/batches/{batch.id}",
        json={"name": "Renamed"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Renamed"


# ── Enrollment ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_enroll_student_rejects_student(client, db_session, tenant):
    from tests.conftest import _make_user, make_access_token

    batch = await _make_batch(db_session, tenant)
    student_user = await _make_user(db_session, tenant, "student")
    token = make_access_token(student_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }

    res = await client.post(
        f"/api/v1/batches/{batch.id}/enroll/{uuid.uuid4()}", headers=headers
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_enroll_student_as_owner(client, owner_headers, db_session, tenant):
    """
    Full enrollment round-trip: create a real student (via the same
    admission-linked fixture pattern as test_students.py) and enroll
    them in a real batch.
    """
    from app.models.admission import Admission
    from app.models.student import Student

    admission = Admission(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        admission_number=f"ADM-{uuid.uuid4().hex[:8]}",
        academic_year="2026-27",
        applied_course="NEET",
        status="CONFIRMED",
    )
    db_session.add(admission)
    await db_session.flush()

    student = Student(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        admission_id=admission.id,
        enrollment_no=f"ENR-{uuid.uuid4().hex[:8]}",
        first_name="Aarav",
        last_name="Sharma",
        is_active=True,
        subjects=[],
    )
    db_session.add(student)
    await db_session.flush()

    batch = await _make_batch(db_session, tenant)

    res = await client.post(
        f"/api/v1/batches/{batch.id}/enroll/{student.id}", headers=owner_headers
    )
    assert res.status_code == 201
    assert res.json()["success"] is True

    # verify it's reflected in the batch's student list
    res2 = await client.get(f"/api/v1/batches/{batch.id}/students", headers=owner_headers)
    assert res2.status_code == 200
    ids = [s["id"] for s in res2.json()["data"]]
    assert str(student.id) in ids


# ── Subjects ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_subjects_rejects_student_role(client, db_session, tenant):
    from tests.conftest import _make_user, make_access_token

    student_user = await _make_user(db_session, tenant, "student")
    token = make_access_token(student_user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }
    res = await client.get("/api/v1/batches/subjects", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_subject_requires_owner(client, counselor_headers):
    res = await client.post(
        "/api/v1/batches/subjects",
        json={"name": "Chemistry"},
        headers=counselor_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_subject_as_owner(client, owner_headers):
    res = await client.post(
        "/api/v1/batches/subjects",
        json={"name": "Chemistry"},
        headers=owner_headers,
    )
    assert res.status_code == 201
    assert res.json()["data"]["name"] == "Chemistry"