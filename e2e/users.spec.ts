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

async function openUsers(page: Page) {
  await page.goto("/settings/users");

  await expect(
    page.getByRole("heading", {
      name: /User Management/i,
    })
  ).toBeVisible();
}

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("page loads", async ({ page }) => {
    await openUsers(page);
  });

  test("invite dialog", async ({ page }) => {
    await openUsers(page);

    await page.getByRole("button", {
      name: /Invite User/i,
    }).click();

    await expect(
  page.getByRole("heading", {
    name: "Invite User",
  })
).toBeVisible();
  });

  test("cancel invite", async ({ page }) => {
    await openUsers(page);

    await page.getByRole("button", {
      name: /Invite User/i,
    }).click();

    await page.getByRole("button", {
      name: /Cancel/i,
    }).click();

    await expect(
      page.getByText("Invite User")
    ).toHaveCount(1);
  });

  test("role permissions visible", async ({ page }) => {
    await openUsers(page);

    await expect(page.getByText("Role Permissions")).toBeVisible();

    await expect(page.getByText("Super Admin")).toBeVisible();

   await expect(
  page.getByText(/^Admin$/)
).toBeVisible();

    await expect(
  page.getByText(/^Coach$/)
).toBeVisible();

  });
});