import { expect, type Page } from "@playwright/test";

export const TEST_INSTITUTE =
  process.env.TEST_INSTITUTE ?? "demo";

export const TEST_EMAIL =
  process.env.TEST_EMAIL ?? "owner@demo.com";

export const TEST_PASSWORD =
  process.env.TEST_PASSWORD ?? "Admin@1234";

export async function loginAsOwner(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);

  await expect(page).toHaveURL(/dashboard/);
}