// import { test, expect, request } from "@playwright/test";

// const BASE_URL =
//   process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

// const TEST_TENANT =
//   process.env.TEST_TENANT ?? "visionacademy";

// const TEST_EMAIL =
//   process.env.TEST_EMAIL ??
//   "rahul.sharma@visionacademy.com";

// const TEST_PASSWORD =
//   process.env.TEST_PASSWORD ??
//   "Lokesh@1234";

// test.describe("Authentication API", () => {
//   test("login succeeds", async () => {
//     const api = await request.newContext({
//       baseURL: BASE_URL,
//       extraHTTPHeaders: {
//         "X-Tenant-Subdomain": TEST_TENANT,
//       },
//     });

//     const response = await api.post("/auth/login", {
//       data: {
//         email: TEST_EMAIL,
//         password: TEST_PASSWORD,
//       },
//     });

//     expect(response.status()).toBe(200);

//     const body = await response.json();

//     expect(body).toHaveProperty("access_token");
//     expect(body.token_type).toBe("bearer");

//     await api.dispose();
//   });

//   test("invalid password returns 401", async () => {
//     const api = await request.newContext({
//       baseURL: BASE_URL,
//       extraHTTPHeaders: {
//         "X-Tenant-Subdomain": TEST_TENANT,
//       },
//     });

//     const response = await api.post("/auth/login", {
//       data: {
//         email: TEST_EMAIL,
//         password: "WrongPassword123",
//       },
//     });

//     expect(response.status()).toBe(401);

//     const body = await response.json();

//     expect(body.detail).toBe("Invalid credentials");

//     await api.dispose();
//   });

//   test("unknown email returns 401", async () => {
//     const api = await request.newContext({
//       baseURL: BASE_URL,
//       extraHTTPHeaders: {
//         "X-Tenant-Subdomain": TEST_TENANT,
//       },
//     });

//     const response = await api.post("/auth/login", {
//       data: {
//         email: "notfound@test.com",
//         password: TEST_PASSWORD,
//       },
//     });

//     expect(response.status()).toBe(401);

//     await api.dispose();
//   });

//   test("missing password returns validation error", async () => {
//     const api = await request.newContext({
//       baseURL: BASE_URL,
//       extraHTTPHeaders: {
//         "X-Tenant-Subdomain": TEST_TENANT,
//       },
//     });

//     const response = await api.post("/auth/login", {
//       data: {
//         email: TEST_EMAIL,
//       },
//     });

//     expect(response.status()).toBe(422);

//     await api.dispose();
//   });

//   test("missing email returns validation error", async () => {
//     const api = await request.newContext({
//       baseURL: BASE_URL,
//       extraHTTPHeaders: {
//         "X-Tenant-Subdomain": TEST_TENANT,
//       },
//     });

//     const response = await api.post("/auth/login", {
//       data: {
//         password: TEST_PASSWORD,
//       },
//     });

//     expect(response.status()).toBe(422);

//     await api.dispose();
//   });
// });

import { test, request, expect } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

const TENANT = process.env.TEST_INSTITUTE ?? "visionacademy";
const EMAIL = process.env.TEST_EMAIL ?? "rahul.sharma@visionacademy.com";
const PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

test.describe("Authentication API Debug", () => {
  test("Debug login endpoint", async () => {
    console.log("====================================");
    console.log("API URL:", BASE_URL);
    console.log("Tenant:", TENANT);
    console.log("Email:", EMAIL);
    console.log("====================================");

    const api = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        "X-Tenant-Subdomain": TENANT,
        "Content-Type": "application/json",
      },
    });

    const response = await api.post("auth/login", {
      data: {
        email: EMAIL,
        password: PASSWORD,
      },
    });

    console.log("Status:", response.status());
    console.log("URL:", response.url());

    const body = await response.text();

    console.log("Response:");
    console.log(body);

    // Fail intentionally if not successful so we can inspect output
    expect(response.ok()).toBeTruthy();

    await api.dispose();
  });

  test("Check health endpoint", async () => {
    const api = await request.newContext({
      baseURL: "http://127.0.0.1:8000",
    });

    const response = await api.get("/health");

    console.log("Health Status:", response.status());
    console.log("Health URL:", response.url());
    console.log("Health Body:", await response.text());

    expect(response.ok()).toBeTruthy();

    await api.dispose();
  });

  test("Check OpenAPI", async () => {
    const api = await request.newContext({
      baseURL: "http://127.0.0.1:8000",
    });

    const response = await api.get("/openapi.json");

    console.log("OpenAPI Status:", response.status());

    if (response.ok()) {
      const json = await response.json();

      console.log("========== ROUTES ==========");

      Object.keys(json.paths)
        .sort()
        .forEach((path) => console.log(path));

      console.log("============================");
    } else {
      console.log(await response.text());
    }

    expect(response.ok()).toBeTruthy();

    await api.dispose();
  });
});