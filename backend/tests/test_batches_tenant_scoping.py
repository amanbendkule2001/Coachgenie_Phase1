"""
Regression tests for the tenant-scoping fixes in services/batch.py:
  - update_syllabus_topic now requires tenant_id
  - delete_syllabus_topic now requires tenant_id
  - create_class now validates batch_id belongs to the caller's tenant

These will FAIL until tenant_scoping_fix.md is applied.
"""
import uuid
from datetime import datetime, timezone

import pytest

from app.models.batch import Batch, Subject
from app.models.syllabus import SyllabusItem
from app.models.tenant import Tenant


async def _make_other_tenant(db_session) -> Tenant:
    t = Tenant(
        id=uuid.uuid4(),
        name="Other Tenant",
        subdomain=f"other-{uuid.uuid4().hex[:8]}",
        plan="basic",
        is_active=True,
        settings={},
    )
    db_session.add(t)
    await db_session.flush()
    return t


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


# ── update_syllabus_topic ────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_syllabus_topic_cross_tenant_returns_404(client, owner_headers, db_session, tenant):
    other_tenant = await _make_other_tenant(db_session)
    other_subject = await _make_subject(db_session, other_tenant)
    other_topic = await _make_topic(db_session, other_tenant, other_subject)

    res = await client.patch(
        f"/api/v1/batches/subjects/syllabus/{other_topic.id}",
        json={"title": "Hijacked title"},
        headers=owner_headers,
    )
    assert res.status_code == 404

    # confirm it truly wasn't modified
    await db_session.refresh(other_topic)
    assert other_topic.title != "Hijacked title"


@pytest.mark.asyncio
async def test_update_syllabus_topic_same_tenant_still_works(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject, title="Original")

    res = await client.patch(
        f"/api/v1/batches/subjects/syllabus/{topic.id}",
        json={"title": "Renamed"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["title"] == "Renamed"


# ── delete_syllabus_topic ────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_syllabus_topic_cross_tenant_returns_404(client, owner_headers, db_session, tenant):
    other_tenant = await _make_other_tenant(db_session)
    other_subject = await _make_subject(db_session, other_tenant)
    other_topic = await _make_topic(db_session, other_tenant, other_subject)

    res = await client.delete(
        f"/api/v1/batches/subjects/syllabus/{other_topic.id}", headers=owner_headers
    )
    assert res.status_code == 404

    # confirm it truly wasn't deleted
    result = await db_session.get(SyllabusItem, other_topic.id)
    assert result is not None


@pytest.mark.asyncio
async def test_delete_syllabus_topic_same_tenant_still_works(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    topic = await _make_topic(db_session, tenant, subject)

    res = await client.delete(
        f"/api/v1/batches/subjects/syllabus/{topic.id}", headers=owner_headers
    )
    assert res.status_code == 200


# ── create_class ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_class_on_other_tenants_batch_returns_404(client, owner_headers, db_session, tenant):
    other_tenant = await _make_other_tenant(db_session)
    other_batch = await _make_batch(db_session, other_tenant)

    res = await client.post(
        "/api/v1/batches/classes",
        json={
            "batch_id": str(other_batch.id),
            "title": "Should not be created",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        },
        headers=owner_headers,
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_create_class_on_own_batch_still_works(client, owner_headers, db_session, tenant):
    batch = await _make_batch(db_session, tenant)

    res = await client.post(
        "/api/v1/batches/classes",
        json={
            "batch_id": str(batch.id),
            "title": "Legit class",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
        },
        headers=owner_headers,
    )
    assert res.status_code == 201