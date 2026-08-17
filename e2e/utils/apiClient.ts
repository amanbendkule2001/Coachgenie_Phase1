import { APIRequestContext, expect, request } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function createApiClient(): Promise<APIRequestContext> {
  const tenant = "visionacademy";

  const unauthenticated = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      "X-Tenant-Subdomain": tenant,
    },
  });

  const login = await unauthenticated.post("/auth/login", {
    data: {
      email: "rahul.sharma@visionacademy.com",
      password: "Lokesh@1234",
    },
  });

  expect(login.ok()).toBeTruthy();

  const body = await login.json();

  await unauthenticated.dispose();

  return await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${body.access_token}`,
      "X-Tenant-Subdomain": tenant,
    },
  });
}