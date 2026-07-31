import {
  APIRequestContext,
  request,
  expect,
} from "@playwright/test";

export const TEST_INSTITUTE =
  process.env.TEST_INSTITUTE ?? "demo";

export const TEST_EMAIL =
  process.env.TEST_EMAIL ?? "owner@demo.com";

export const TEST_PASSWORD =
  process.env.TEST_PASSWORD ?? "Admin@1234";

export async function createApiContext(): Promise<APIRequestContext> {
  const api = await request.newContext({
    baseURL: process.env.API_URL ?? "http://127.0.0.1:8000/api/v1",
  });

  const login = await api.post("/auth/login", {
    data: {
      institute: TEST_INSTITUTE,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  expect(login.ok()).toBeTruthy();

  const body = await login.json();

  await api.dispose();

  return request.newContext({
    baseURL: process.env.API_URL ?? "http://127.0.0.1:8000/api/v1",
    extraHTTPHeaders: {
      Authorization: `Bearer ${body.access_token}`,
      "X-Tenant-Subdomain": TEST_INSTITUTE,
    },
  });
}