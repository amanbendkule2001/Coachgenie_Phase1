import { test, expect, request } from "@playwright/test";

const BASE =
  process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

test.describe("Authentication API", () => {
  test("login succeeds", async () => {
    const api = await request.newContext({
      baseURL: BASE,
    });

    const res = await api.post("/auth/login", {
      data: {
        institute: "demo",
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

  test("invalid password", async () => {
    const api = await request.newContext({
      baseURL: BASE,
    });

    const res = await api.post("/auth/login", {
      data: {
        institute: "demo",
        email: "owner@demo.com",
        password: "wrongpassword",
      },
    });

    expect(res.status()).toBe(401);

    await api.dispose();
  });
});