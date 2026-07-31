import uuid
from datetime import datetime, timezone

import pytest

from app.models.batch import Batch, Class, Subject, BatchStudent
from app.models.syllabus import SyllabusItem, SyllabusProgress
from app.models.tenant import Tenant


# ── Fixtures (local helpers, matching test_batches.py conventions) ──


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


async def _make_class(db_session, tenant, batch, **overrides) -> Class:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        batch_id=batch.id,
        title="Intro to Organic Chem",
        scheduled_at=datetime.now(timezone.utc),
        duration_min=60,
        status="scheduled",
    )
    defaults.update(overrides)
    c = Class(**defaults)
    db_session.add(c)
    await db_session.flush()
    return c


async def _make_topic(db_session, tenant, subject, **overrides) -> SyllabusItem:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        subject_id=subject.id,
        title="Alkanes and Alkenes",
        sort_order=0,
    )
    defaults.update(overrides)
    t = SyllabusItem(**defaults)
    db_session.add(t)
    await db_session.flush()
    return t


async def _make_progress(db_session, tenant, batch, topic, **overrides) -> SyllabusProgress:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        batch_id=batch.id,
        topic_id=topic.id,
        status="in_progress",
    )
    defaults.update(overrides)
    # Mirror the real upsert_syllabus_progress behavior: completed_at is only
    # ever set when status is "completed". Since this fixture writes directly
    # to the DB (bypassing the service), set it here too unless the caller
    # already passed an explicit completed_at.
    if defaults["status"] == "completed" and "completed_at" not in overrides:
        defaults["completed_at"] = datetime.now(timezone.utc)
    p = SyllabusProgress(**defaults)
    db_session.add(p)
    await db_session.flush()
    return p


async def _headers_for_role(db_session, tenant, role):
    from tests.conftest import _make_user, make_access_token

    user = await _make_user(db_session, tenant, role)
    token = make_access_token(user, tenant)
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }


# ── Classes: list ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_classes_requires_auth(client, tenant, db_session):
    batch = await _make_batch(db_session, tenant)
    res = await client.get(
        f"/api/v1/batches/{batch.id}/classes",
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_classes_as_student(client, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    await _make_class(db_session, tenant, batch)
    headers = await _headers_for_role(db_session, tenant, "student")

    res = await client.get(f"/api/v1/batches/{batch.id}/classes", headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert len(res.json()["data"]) == 1


@pytest.mark.asyncio
async def test_list_classes_scoped_to_batch(client, owner_headers, db_session, tenant):
    batch_a = await _make_batch(db_session, tenant, name="Batch A")
    batch_b = await _make_batch(db_session, tenant, name="Batch B")
    await _make_class(db_session, tenant, batch_a, title="Class in A")
    await _make_class(db_session, tenant, batch_b, title="Class in B")

    res = await client.get(f"/api/v1/batches/{batch_a.id}/classes", headers=owner_headers)
    assert res.status_code == 200
    titles = [c["title"] for c in res.json()["data"]]
    assert titles == ["Class in A"]


# ── Classes: create ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_class_rejects_counselor(client, counselor_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    res = await client.post(
        "/api/v1/batches/classes",
        json={
            "batch_id": str(batch.id),
            "title": "New Class",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        },
        headers=counselor_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_class_as_tutor(client, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    headers = await _headers_for_role(db_session, tenant, "tutor")

    res = await client.post(
        "/api/v1/batches/classes",
        json={
            "batch_id": str(batch.id),
            "title": "New Class",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "duration_min": 45,
        },
        headers=headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["data"]["title"] == "New Class"
    assert body["data"]["duration_min"] == 45
    assert body["data"]["status"] == "scheduled"


@pytest.mark.asyncio
async def test_create_class_as_owner(client, owner_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    res = await client.post(
        "/api/v1/batches/classes",
        json={
            "batch_id": str(batch.id),
            "title": "Owner-created Class",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        },
        headers=owner_headers,
    )
    assert res.status_code == 201


# ── Classes: update ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_class_rejects_counselor(client, counselor_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    cls = await _make_class(db_session, tenant, batch)
    res = await client.patch(
        f"/api/v1/batches/classes/{cls.id}",
        json={"status": "cancelled"},
        headers=counselor_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_class_as_owner(client, owner_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant)
    cls = await _make_class(db_session, tenant, batch, title="Original Title")
    res = await client.patch(
        f"/api/v1/batches/classes/{cls.id}",
        json={"title": "Updated Title", "status": "completed"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["title"] == "Updated Title"
    assert res.json()["data"]["status"] == "completed"


@pytest.mark.asyncio
async def test_update_class_nonexistent_returns_404(client, owner_headers):
    res = await client.patch(
        f"/api/v1/batches/classes/{uuid.uuid4()}",
        json={"title": "Doesn't matter"},
        headers=owner_headers,
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_class_from_other_tenant_returns_404(client, owner_headers, db_session, tenant):
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
    other_cls = await _make_class(db_session, other_tenant, other_batch)

    res = await client.patch(
        f"/api/v1/batches/classes/{other_cls.id}",
        json={"title": "Should not apply"},
        headers=owner_headers,
    )
    assert res.status_code == 404


# ── Syllabus topics ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_syllabus_topic_rejects_counselor(client, counselor_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    res = await client.post(
        f"/api/v1/batches/subjects/{subject.id}/syllabus",
        json={"subject_id": str(subject.id), "title": "Thermodynamics"},
        headers=counselor_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_syllabus_topic_as_owner(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    res = await client.post(
        f"/api/v1/batches/subjects/{subject.id}/syllabus",
        json={"subject_id": str(subject.id), "title": "Thermodynamics", "sort_order": 2},
        headers=owner_headers,
    )
    assert res.status_code == 201
    assert res.json()["data"]["title"] == "Thermodynamics"
    assert res.json()["data"]["sort_order"] == 2


@pytest.mark.asyncio
async def test_list_syllabus_topics_as_student(client, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    await _make_topic(db_session, tenant, subject, title="Topic 1", sort_order=1)
    await _make_topic(db_session, tenant, subject, title="Topic 0", sort_order=0)
    headers = await _headers_for_role(db_session, tenant, "student")

    res = await client.get(f"/api/v1/batches/subjects/{subject.id}/syllabus", headers=headers)
    assert res.status_code == 200
    titles = [t["title"] for t in res.json()["data"]]
    assert titles == ["Topic 0", "Topic 1"]  # ordered by sort_order


@pytest.mark.asyncio
async def test_update_syllabus_topic_as_tutor(client, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject, title="Original")
    headers = await _headers_for_role(db_session, tenant, "tutor")

    res = await client.patch(
        f"/api/v1/batches/subjects/syllabus/{topic.id}",
        json={"title": "Renamed Topic"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["title"] == "Renamed Topic"


@pytest.mark.asyncio
async def test_update_syllabus_topic_rejects_counselor(client, counselor_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject)
    res = await client.patch(
        f"/api/v1/batches/subjects/syllabus/{topic.id}",
        json={"title": "Should be rejected"},
        headers=counselor_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_delete_syllabus_topic_as_owner(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject)
    res = await client.delete(
        f"/api/v1/batches/subjects/syllabus/{topic.id}", headers=owner_headers
    )
    assert res.status_code == 200
    assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_delete_syllabus_topic_nonexistent_returns_404(client, owner_headers):
    res = await client.delete(f"/api/v1/batches/subjects/syllabus/{uuid.uuid4()}", headers=owner_headers)
    assert res.status_code == 404


# ── Syllabus progress (per batch) ────────────────────────────────


@pytest.mark.asyncio
async def test_get_batch_syllabus_defaults_to_not_started(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    batch = await _make_batch(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject, title="No progress yet")

    res = await client.get(
        f"/api/v1/batches/{batch.id}/syllabus",
        params={"subject_id": str(subject.id)},
        headers=owner_headers,
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert data[0]["status"] == "not_started"
    assert data[0]["progress_id"] is None


@pytest.mark.asyncio
async def test_get_batch_syllabus_merges_existing_progress(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    batch = await _make_batch(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject)
    await _make_progress(db_session, tenant, batch, topic, status="completed", notes="done in class")

    res = await client.get(
        f"/api/v1/batches/{batch.id}/syllabus",
        params={"subject_id": str(subject.id)},
        headers=owner_headers,
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data[0]["status"] == "completed"
    assert data[0]["notes"] == "done in class"
    assert data[0]["completed_at"] is not None


@pytest.mark.asyncio
async def test_update_topic_progress_rejects_counselor(client, counselor_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    batch = await _make_batch(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject)

    res = await client.post(
        f"/api/v1/batches/{batch.id}/syllabus/{topic.id}/progress",
        json={"status": "in_progress"},
        headers=counselor_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_update_topic_progress_creates_then_updates(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    batch = await _make_batch(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject)

    # First call creates the progress row
    res1 = await client.post(
        f"/api/v1/batches/{batch.id}/syllabus/{topic.id}/progress",
        json={"status": "in_progress"},
        headers=owner_headers,
    )
    assert res1.status_code == 200
    assert res1.json()["data"]["status"] == "in_progress"
    progress_id = res1.json()["data"]["id"]

    # Second call updates the same row (upsert) and sets completed_at
    res2 = await client.post(
        f"/api/v1/batches/{batch.id}/syllabus/{topic.id}/progress",
        json={"status": "completed", "notes": "wrapped up"},
        headers=owner_headers,
    )
    assert res2.status_code == 200
    assert res2.json()["data"]["status"] == "completed"
    assert res2.json()["data"]["id"] == progress_id  # same row, not a duplicate

    # Confirm via the merged syllabus view
    res3 = await client.get(
        f"/api/v1/batches/{batch.id}/syllabus",
        params={"subject_id": str(subject.id)},
        headers=owner_headers,
    )
    merged = res3.json()["data"][0]
    assert merged["status"] == "completed"
    assert merged["notes"] == "wrapped up"


# ── By-student lookup ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_batches_for_student_returns_enrolled_batches(client, owner_headers, db_session, tenant):
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
        first_name="Diya",
        last_name="Patel",
        is_active=True,
        subjects=[],
    )
    db_session.add(student)
    await db_session.flush()

    batch = await _make_batch(db_session, tenant)
    db_session.add(BatchStudent(batch_id=batch.id, student_id=student.id))
    await db_session.flush()

    res = await client.get(f"/api/v1/batches/by-student/{student.id}", headers=owner_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == str(batch.id)
    assert str(student.id) in data[0]["student_ids"]


@pytest.mark.asyncio
async def test_get_batches_for_student_empty_when_unenrolled(client, owner_headers):
    res = await client.get(
        f"/api/v1/batches/by-student/{uuid.uuid4()}", headers=owner_headers
    )
    assert res.status_code == 200
    assert res.json()["data"] == []


@pytest.mark.asyncio
async def test_get_batches_for_student_allows_student_role(client, db_session, tenant):
    headers = await _headers_for_role(db_session, tenant, "student")
    res = await client.get(f"/api/v1/batches/by-student/{uuid.uuid4()}", headers=headers)
    assert res.status_code == 200