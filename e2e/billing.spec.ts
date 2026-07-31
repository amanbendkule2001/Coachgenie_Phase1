import { test, expect, type Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/dashboard/);
}

async function openBilling(page: Page) {
  await page.goto("/settings/billing");

  await expect(
    page.getByRole("heading", {
      name: /Subscription/i,
    })
  ).toBeVisible();
}

test.describe("Billing", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("billing page loads", async ({ page }) => {
    await openBilling(page);
  });

  test("current plan visible", async ({ page }) => {
    await openBilling(page);

   await expect(
  page.getByRole("paragraph")
    .filter({ hasText: "Current Plan" })
).toBeVisible();

   await expect(
  page.locator("p.text-2xl.font-bold").filter({
    hasText: "Growth",
  })
).toBeVisible();
  });

  test("plans visible", async ({ page }) => {
    await openBilling(page);

    await expect(page.getByText(/^Starter$/)).toBeVisible();

    await expect(
  page.getByText(/^Growth$/).last()
).toBeVisible();

    await expect(page.getByText(/^Enterprise$/)).toBeVisible();
  });

  test("billing history visible", async ({ page }) => {
    await openBilling(page);

await expect(
  page.getByRole("heading", {
    name: "Billing History",
  })
).toBeVisible();
  });

  test("download receipt buttons", async ({ page }) => {
    await openBilling(page);

    await expect(
      page.getByRole("button", {
        name: /Download/i,
      }).first()
    ).toBeVisible();
  });
});