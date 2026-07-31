# import uuid

# import pytest

# from app.models.tenant import Tenant
# from app.models.lead import Lead


# async def _make_other_tenant(db_session) -> Tenant:
#     t = Tenant(
#         id=uuid.uuid4(),
#         name="Other Tenant",
#         subdomain=f"other-{uuid.uuid4().hex[:8]}",
#         plan="basic",
#         is_active=True,
#         settings={},
#     )
#     db_session.add(t)
#     await db_session.flush()
#     return t


# # async def _headers_for_role(db_session, tenant, role):
# #     from tests.conftest import _make_user, make_access_token

# #     user = await _make_user(db_session, tenant, role)
# #     token = make_access_token(user, tenant)
# #     return {
# #         "Authorization": f"Bearer {token}",
# #         "X-Tenant-Subdomain": tenant.subdomain,
# #     }
# async def _headers_for_role(db_session, tenant, role):
#     from tests.conftest import _make_user, make_access_token

#     user = await _make_user(db_session, tenant, role)
#     token = make_access_token(user, tenant)
#     headers = {
#         "Authorization": f"Bearer {token}",
#         "X-Tenant-Subdomain": tenant.subdomain,
#     }
#     return headers, user


# async def _make_lead(db_session, tenant, **overrides) -> Lead:
#     defaults = dict(
#         id=uuid.uuid4(),
#         tenant_id=tenant.id,
#         full_name="Ananya Gupta",
#         phone="9876543210",
#         source="website",
#         status="new",
#     )
#     defaults.update(overrides)
#     lead = Lead(**defaults)
#     db_session.add(lead)
#     await db_session.flush()
#     return lead


# # ── List ─────────────────────────────────────────────────────────


# @pytest.mark.asyncio
# async def test_list_leads_requires_auth(client, tenant):
#     res = await client.get(
#         "/api/v1/leads/", headers={"X-Tenant-Subdomain": tenant.subdomain}
#     )
#     assert res.status_code == 401


# @pytest.mark.asyncio
# async def test_list_leads_rejects_tutor(client, db_session, tenant):
#     headers = await _headers_for_role(db_session, tenant, "tutor")
#     res = await client.get("/api/v1/leads/", headers=headers)
#     assert res.status_code == 403


# @pytest.mark.asyncio
# async def test_list_leads_as_owner(client, owner_headers, db_session, tenant):
#     await _make_lead(db_session, tenant)
#     res = await client.get("/api/v1/leads/", headers=owner_headers)
#     assert res.status_code == 200
#     assert res.json()["success"] is True


# # ── Create ───────────────────────────────────────────────────────


# @pytest.mark.asyncio
# async def test_create_lead_rejects_tutor(client, db_session, tenant):
#     headers = await _headers_for_role(db_session, tenant, "tutor")
#     res = await client.post(
#         "/api/v1/leads/",
#         json={"full_name": "Rejected Lead", "phone": "9000000000"},
#         headers=headers,
#     )
#     assert res.status_code == 403


# @pytest.mark.asyncio
# async def test_create_lead_as_counselor(client, db_session, tenant):
#     headers = await _headers_for_role(db_session, tenant, "counselor")
#     res = await client.post(
#         "/api/v1/leads/",
#         json={"full_name": "New Lead", "phone": "9000000001", "source": "referral"},
#         headers=headers,
#     )
#     assert res.status_code == 201
#     data = res.json()["data"]
#     assert data["full_name"] == "New Lead"
#     assert data["status"] == "new"
#     assert data["source"] == "referral"


# @pytest.mark.asyncio
# async def test_create_lead_requires_full_name_and_phone(client, owner_headers):
#     res = await client.post("/api/v1/leads/", json={}, headers=owner_headers)
#     assert res.status_code == 422


# # ── Get ──────────────────────────────────────────────────────────


# @pytest.mark.asyncio
# async def test_get_lead_own_tenant(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.get(f"/api/v1/leads/{lead.id}", headers=owner_headers)
#     assert res.status_code == 200
#     assert res.json()["data"]["full_name"] == "Ananya Gupta"


# @pytest.mark.asyncio
# async def test_get_lead_cross_tenant_returns_404(client, owner_headers, db_session, tenant):
#     other_tenant = await _make_other_tenant(db_session)
#     other_lead = await _make_lead(db_session, other_tenant)

#     res = await client.get(f"/api/v1/leads/{other_lead.id}", headers=owner_headers)
#     assert res.status_code == 404


# # ── Update / Delete ──────────────────────────────────────────────


# @pytest.mark.asyncio
# async def test_update_lead_basic_field(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.patch(
#         f"/api/v1/leads/{lead.id}",
#         json={"notes": "Called, interested in NEET batch"},
#         headers=owner_headers,
#     )
#     assert res.status_code == 200
#     assert res.json()["data"]["notes"] == "Called, interested in NEET batch"


# @pytest.mark.asyncio
# async def test_delete_lead_rejects_counselor(client, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     headers = await _headers_for_role(db_session, tenant, "counselor")
#     res = await client.delete(f"/api/v1/leads/{lead.id}", headers=headers)
#     assert res.status_code == 403


# @pytest.mark.asyncio
# async def test_delete_lead_as_owner(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.delete(f"/api/v1/leads/{lead.id}", headers=owner_headers)
#     assert res.status_code == 200
#     assert res.json()["success"] is True


# # ── Pipeline actions ─────────────────────────────────────────────


# # @pytest.mark.asyncio
# # async def test_assign_counselor(client, owner_headers, db_session, tenant):
# #     lead = await _make_lead(db_session, tenant)
# #     counselor_headers = await _headers_for_role(db_session, tenant, "counselor")
# #     # grab the counselor's own user id via /auth/me equivalent isn't available here,
# #     # so just assign an arbitrary UUID -- the endpoint doesn't validate FK existence.
# #     counselor_id = str(uuid.uuid4())

# #     res = await client.post(
# #         f"/api/v1/leads/{lead.id}/assign-counselor",
# #         json={"counselor_id": counselor_id},
# #         headers=owner_headers,
# #     )
# #     assert res.status_code == 200
# #     assert res.json()["data"]["id"] == str(lead.id)
# async def test_assign_counselor(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     counselor_headers, counselor_user = await _headers_for_role(db_session, tenant, "counselor")
#     counselor_id = str(counselor_user.id)

#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/assign-counselor",
#         json={"counselor_id": counselor_id},
#         headers=owner_headers,
#     )



# @pytest.mark.asyncio
# async def test_change_stage_valid(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/change-stage",
#         json={"stage": "contacted"},
#         headers=owner_headers,
#     )
#     assert res.status_code == 200
#     assert res.json()["data"]["status"] == "contacted"


# @pytest.mark.asyncio
# async def test_change_stage_invalid_returns_422(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/change-stage",
#         json={"stage": "not_a_real_stage"},
#         headers=owner_headers,
#     )
#     assert res.status_code == 422


# @pytest.mark.asyncio
# async def test_schedule_followup_with_notes_creates_activity(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/schedule-followup",
#         json={"follow_up_date": "2026-08-15", "notes": "Call back after demo class"},
#         headers=owner_headers,
#     )
#     assert res.status_code == 200
#     assert res.json()["data"]["follow_up_date"] == "2026-08-15"

#     activities_res = await client.get(
#         f"/api/v1/leads/{lead.id}/activities", headers=owner_headers
#     )
#     assert activities_res.status_code == 200
#     activities = activities_res.json()["data"]
#     assert any(a["description"] == "Call back after demo class" for a in activities)


# # ── Convert ──────────────────────────────────────────────────────


# @pytest.mark.asyncio
# async def test_convert_lead_success(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant, full_name="Convert Me", status="interested")
#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/convert",
#         json={"applied_course": "NEET"},
#         headers=owner_headers,
#     )
#     assert res.status_code == 201
#     data = res.json()["data"]
#     assert data["admission_number"].startswith("ADM-")
#     assert data["enrollment_no"].startswith("STU-")

#     await db_session.refresh(lead)
#     assert lead.status == "converted"


# @pytest.mark.asyncio
# async def test_convert_already_converted_lead_returns_400(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant, status="converted")
#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/convert", json={}, headers=owner_headers
#     )
#     # NotFoundError/ConflictError are both caught and rewrapped as 400 by this
#     # endpoint's bare except-Exception handler (see note above) -- NOT 409.
#     assert res.status_code == 400


# @pytest.mark.asyncio
# async def test_convert_nonexistent_lead_returns_400(client, owner_headers):
#     res = await client.post(
#         f"/api/v1/leads/{uuid.uuid4()}/convert", json={}, headers=owner_headers
#     )
#     # NotFoundError rewrapped as 400 here, unlike get_lead's plain 404.
#     assert res.status_code == 400


# # ── Activities ───────────────────────────────────────────────────


# @pytest.mark.asyncio
# async def test_add_activity(client, owner_headers, db_session, tenant):
#     lead = await _make_lead(db_session, tenant)
#     res = await client.post(
#         f"/api/v1/leads/{lead.id}/activities",
#         json={"type": "call", "description": "Left voicemail"},
#         headers=owner_headers,
#     )
#     assert res.status_code == 201
#     assert res.json()["data"]["description"] == "Left voicemail"


# @pytest.mark.asyncio
# async def test_list_activities_scoped_to_lead(client, owner_headers, db_session, tenant):
#     lead_a = await _make_lead(db_session, tenant, full_name="Lead A", phone="9000000010")
#     lead_b = await _make_lead(db_session, tenant, full_name="Lead B", phone="9000000011")

#     await client.post(
#         f"/api/v1/leads/{lead_a.id}/activities",
#         json={"type": "call", "description": "Note on A"},
#         headers=owner_headers,
#     )
#     await client.post(
#         f"/api/v1/leads/{lead_b.id}/activities",
#         json={"type": "call", "description": "Note on B"},
#         headers=owner_headers,
#     )

#     res = await client.get(f"/api/v1/leads/{lead_a.id}/activities", headers=owner_headers)
#     descriptions = [a["description"] for a in res.json()["data"]]
#     assert descriptions == ["Note on A"]


import uuid

import pytest

from app.models.tenant import Tenant
from app.models.lead import Lead


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


async def _headers_for_role(db_session, tenant, role):
    from tests.conftest import _make_user, make_access_token

    user = await _make_user(db_session, tenant, role)
    token = make_access_token(user, tenant)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Subdomain": tenant.subdomain,
    }
    return headers, user


async def _make_lead(db_session, tenant, **overrides) -> Lead:
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        full_name="Ananya Gupta",
        phone="9876543210",
        source="website",
        status="new",
    )
    defaults.update(overrides)
    lead = Lead(**defaults)
    db_session.add(lead)
    await db_session.flush()
    return lead


# ── List ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_leads_requires_auth(client, tenant):
    res = await client.get(
        "/api/v1/leads/", headers={"X-Tenant-Subdomain": tenant.subdomain}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_leads_rejects_tutor(client, db_session, tenant):
    headers, _ = await _headers_for_role(db_session, tenant, "tutor")
    res = await client.get("/api/v1/leads/", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_list_leads_as_owner(client, owner_headers, db_session, tenant):
    await _make_lead(db_session, tenant)
    res = await client.get("/api/v1/leads/", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True


# ── Create ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_lead_rejects_tutor(client, db_session, tenant):
    headers, _ = await _headers_for_role(db_session, tenant, "tutor")
    res = await client.post(
        "/api/v1/leads/",
        json={"full_name": "Rejected Lead", "phone": "9000000000"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_lead_as_counselor(client, db_session, tenant):
    headers, _ = await _headers_for_role(db_session, tenant, "counselor")
    res = await client.post(
        "/api/v1/leads/",
        json={"full_name": "New Lead", "phone": "9000000001", "source": "referral"},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["full_name"] == "New Lead"
    assert data["status"] == "new"
    assert data["source"] == "referral"


@pytest.mark.asyncio
async def test_create_lead_requires_full_name_and_phone(client, owner_headers):
    res = await client.post("/api/v1/leads/", json={}, headers=owner_headers)
    assert res.status_code == 422


# ── Get ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_lead_own_tenant(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.get(f"/api/v1/leads/{lead.id}", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["data"]["full_name"] == "Ananya Gupta"


@pytest.mark.asyncio
async def test_get_lead_cross_tenant_returns_404(client, owner_headers, db_session, tenant):
    other_tenant = await _make_other_tenant(db_session)
    other_lead = await _make_lead(db_session, other_tenant)

    res = await client.get(f"/api/v1/leads/{other_lead.id}", headers=owner_headers)
    assert res.status_code == 404


# ── Update / Delete ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_lead_basic_field(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.patch(
        f"/api/v1/leads/{lead.id}",
        json={"notes": "Called, interested in NEET batch"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["notes"] == "Called, interested in NEET batch"


@pytest.mark.asyncio
async def test_delete_lead_rejects_counselor(client, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    headers, _ = await _headers_for_role(db_session, tenant, "counselor")
    res = await client.delete(f"/api/v1/leads/{lead.id}", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_delete_lead_as_owner(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.delete(f"/api/v1/leads/{lead.id}", headers=owner_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True


# ── Pipeline actions ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_assign_counselor(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    counselor_headers, counselor_user = await _headers_for_role(db_session, tenant, "counselor")
    counselor_id = str(counselor_user.id)

    res = await client.post(
        f"/api/v1/leads/{lead.id}/assign-counselor",
        json={"counselor_id": counselor_id},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["id"] == str(lead.id)


@pytest.mark.asyncio
async def test_change_stage_valid(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.post(
        f"/api/v1/leads/{lead.id}/change-stage",
        json={"stage": "contacted"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "contacted"


@pytest.mark.asyncio
async def test_change_stage_invalid_returns_422(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.post(
        f"/api/v1/leads/{lead.id}/change-stage",
        json={"stage": "not_a_real_stage"},
        headers=owner_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_schedule_followup_with_notes_creates_activity(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.post(
        f"/api/v1/leads/{lead.id}/schedule-followup",
        json={"follow_up_date": "2026-08-15", "notes": "Call back after demo class"},
        headers=owner_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["follow_up_date"] == "2026-08-15"

    activities_res = await client.get(
        f"/api/v1/leads/{lead.id}/activities", headers=owner_headers
    )
    assert activities_res.status_code == 200
    activities = activities_res.json()["data"]
    assert any(a["description"] == "Call back after demo class" for a in activities)


# ── Convert ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_convert_lead_success(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant, full_name="Convert Me", status="interested")
    res = await client.post(
        f"/api/v1/leads/{lead.id}/convert",
        json={"applied_course": "NEET"},
        headers=owner_headers,
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["admission_number"].startswith("ADM-")
    assert data["enrollment_no"].startswith("STU-")

    await db_session.refresh(lead)
    assert lead.status == "converted"


@pytest.mark.asyncio
async def test_convert_already_converted_lead_returns_400(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant, status="converted")
    res = await client.post(
        f"/api/v1/leads/{lead.id}/convert", json={}, headers=owner_headers
    )
    # NotFoundError/ConflictError are both caught and rewrapped as 400 by this
    # endpoint's bare except-Exception handler (see note above) -- NOT 409.
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_convert_nonexistent_lead_returns_400(client, owner_headers):
    res = await client.post(
        f"/api/v1/leads/{uuid.uuid4()}/convert", json={}, headers=owner_headers
    )
    # NotFoundError rewrapped as 400 here, unlike get_lead's plain 404.
    assert res.status_code == 400


# ── Activities ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_add_activity(client, owner_headers, db_session, tenant):
    lead = await _make_lead(db_session, tenant)
    res = await client.post(
        f"/api/v1/leads/{lead.id}/activities",
        json={"type": "call", "description": "Left voicemail"},
        headers=owner_headers,
    )
    assert res.status_code == 201
    assert res.json()["data"]["description"] == "Left voicemail"


@pytest.mark.asyncio
async def test_list_activities_scoped_to_lead(client, owner_headers, db_session, tenant):
    lead_a = await _make_lead(db_session, tenant, full_name="Lead A", phone="9000000010")
    lead_b = await _make_lead(db_session, tenant, full_name="Lead B", phone="9000000011")

    await client.post(
        f"/api/v1/leads/{lead_a.id}/activities",
        json={"type": "call", "description": "Note on A"},
        headers=owner_headers,
    )
    await client.post(
        f"/api/v1/leads/{lead_b.id}/activities",
        json={"type": "call", "description": "Note on B"},
        headers=owner_headers,
    )

    res = await client.get(f"/api/v1/leads/{lead_a.id}/activities", headers=owner_headers)
    descriptions = [a["description"] for a in res.json()["data"]]
    assert descriptions == ["Note on A"]