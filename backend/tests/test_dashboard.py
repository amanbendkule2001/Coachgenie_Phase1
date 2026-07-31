import pytest


@pytest.mark.asyncio
async def test_dashboard_owner_requires_auth(client, tenant):
    res = await client.get(
        "/api/v1/dashboard/owner",
        headers={"X-Tenant-Subdomain": tenant.subdomain},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_owner_returns_expected_shape(client, owner_headers):
    """
    Regression test for the frontend/backend response-shape mismatch
    from this session: KpiCards.tsx expects {"success": true, "data": {...}}
    with a DashboardData object directly under "data" (not "data.data").
    """
    res = await client.get("/api/v1/dashboard/owner", headers=owner_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    for field in (
        "total_students",
        "active_batches",
        "total_revenue",
        "avg_attendance_percent",
    ):
        assert field in data, f"missing '{field}' in dashboard response"