import { test, expect, request } from "@playwright/test";

const BASE_URL =
  process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

const TEST_EMAIL =
  process.env.TEST_EMAIL ?? "owner@demo.com";

const TEST_PASSWORD =
  process.env.TEST_PASSWORD ?? "Admin@1234";

test.describe("Authentication API", () => {
  test("login succeeds", async () => {
    const api = await request.newContext({
      baseURL: BASE_URL,
    });

    const response = await api.post("/auth/login", {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty("access_token");
    expect(body.token_type).toBe("bearer");

    await api.dispose();
  });

  test("invalid password returns 401", async () => {
    const api = await request.newContext({
      baseURL: BASE_URL,
    });

    const response = await api.post("/auth/login", {
      data: {
        email: TEST_EMAIL,
        password: "WrongPassword123",
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();

    expect(body.detail).toBe("Invalid credentials");

    await api.dispose();
  });

  test("unknown email returns 401", async () => {
    const api = await request.newContext({
      baseURL: BASE_URL,
    });

    const response = await api.post("/auth/login", {
      data: {
        email: "notfound@test.com",
        password: TEST_PASSWORD,
      },
    });

    expect(response.status()).toBe(401);

    await api.dispose();
  });

  test("missing password returns validation error", async () => {
    const api = await request.newContext({
      baseURL: BASE_URL,
    });

    const response = await api.post("/auth/login", {
      data: {
        email: TEST_EMAIL,
      },
    });

    expect(response.status()).toBe(422);

    await api.dispose();
  });

  test("missing email returns validation error", async () => {
    const api = await request.newContext({
      baseURL: BASE_URL,
    });

    const response = await api.post("/auth/login", {
      data: {
        password: TEST_PASSWORD,
      },
    });

    expect(response.status()).toBe(422);

    await api.dispose();
  });
});