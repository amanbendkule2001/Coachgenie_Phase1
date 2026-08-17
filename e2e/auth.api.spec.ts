import { test, expect, request } from "@playwright/test";

const BASE = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";
const TEST_TENANT = process.env.TEST_INSTITUTE ?? "demo";

test.describe("Authentication API", () => {
  test("login succeeds", async () => {
    const api = await request.newContext({ baseURL: BASE });

    // FIX BUG-017: tenant sent as X-Tenant-Subdomain header, not in request body
    const res = await api.post("/auth/login", {
      headers: { "X-Tenant-Subdomain": TEST_TENANT },
      data: {
        email: "owner@demo.com",
        password: "Admin@1234",
      },
    });

    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe("bearer");

    await api.dispose();
  });

  test("invalid password returns 401", async () => {
    const api = await request.newContext({ baseURL: BASE });

    const res = await api.post("/auth/login", {
      headers: { "X-Tenant-Subdomain": TEST_TENANT },
      data: {
        email: "owner@demo.com",
        password: "wrongpassword",
      },
    });

    expect(res.status()).toBe(401);

    await api.dispose();
  });

  test("missing tenant header returns error", async () => {
    const api = await request.newContext({ baseURL: BASE });

    // No X-Tenant-Subdomain header — must be rejected
    const res = await api.post("/auth/login", {
      data: {
        email: "owner@demo.com",
        password: "Admin@1234",
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);

    await api.dispose();
  });
});