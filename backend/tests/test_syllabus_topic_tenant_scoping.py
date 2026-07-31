"""
Regression tests for the tenant-scoping fix in services/batch.py:
  - get_syllabus_topics now requires tenant_id
  - create_syllabus_topic now validates subject_id belongs to the caller's tenant

These will FAIL until syllabus_topic_scoping_fix.md is applied.
"""
import uuid

import pytest

from app.models.batch import Subject
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


# ── get_syllabus_topics ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_syllabus_topics_cross_tenant_subject_returns_empty_or_404(
    client, owner_headers, db_session, tenant
):
    other_tenant = await _make_other_tenant(db_session)
    other_subject = await _make_subject(db_session, other_tenant)
    await _make_topic(db_session, other_tenant, other_subject, title="Secret topic")

    res = await client.get(
        f"/api/v1/batches/subjects/{other_subject.id}/syllabus", headers=owner_headers
    )
    # Either is acceptable: empty list (topics filtered out) or 404 (subject
    # itself not found for this tenant). What must NOT happen is leaking
    # the other tenant's topic titles.
    assert res.status_code in (200, 404)
    if res.status_code == 200:
        assert res.json()["data"] == []


@pytest.mark.asyncio
async def test_list_syllabus_topics_same_tenant_still_works(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)
    await _make_topic(db_session, tenant, subject, title="Visible topic")

    res = await client.get(
        f"/api/v1/batches/subjects/{subject.id}/syllabus", headers=owner_headers
    )
    assert res.status_code == 200
    titles = [t["title"] for t in res.json()["data"]]
    assert titles == ["Visible topic"]


# ── create_syllabus_topic ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_syllabus_topic_on_other_tenants_subject_returns_404(
    client, owner_headers, db_session, tenant
):
    other_tenant = await _make_other_tenant(db_session)
    other_subject = await _make_subject(db_session, other_tenant)

    res = await client.post(
        f"/api/v1/batches/subjects/{other_subject.id}/syllabus",
        json={"subject_id": str(other_subject.id), "title": "Should not be created"},
        headers=owner_headers,
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_create_syllabus_topic_on_own_subject_still_works(client, owner_headers, db_session, tenant):
    subject = await _make_subject(db_session, tenant)

    res = await client.post(
        f"/api/v1/batches/subjects/{subject.id}/syllabus",
        json={"subject_id": str(subject.id), "title": "Legit topic"},
        headers=owner_headers,
    )
    assert res.status_code == 201
    assert res.json()["data"]["title"] == "Legit topic"