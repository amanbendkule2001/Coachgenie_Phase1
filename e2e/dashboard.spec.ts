import { test, expect, type Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", {
    name: /sign in/i,
  }).click();

  await page.waitForURL(/dashboard/);
}

async function openDashboard(page: Page) {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", {
      name: /^Dashboard$/,
    })
  ).toBeVisible();
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("dashboard loads", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.getByText(/Welcome back/i)
    ).toBeVisible();
  });

  test("kpi cards visible", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.getByText(/Total Students/i)
    ).toBeVisible();

    await expect(
      page.getByText(/Active Batches/i)
    ).toBeVisible();

    await expect(
      page.getByText(/Fee Collected/i)
    ).toBeVisible();

    await expect(
      page.getByText(/Attendance Rate/i)
    ).toBeVisible();
  });

  test("fee collection widget visible", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.getByText("Fee Collection")
    ).toBeVisible();

    await expect(
      page.getByText(/Monthly trend/i)
    ).toBeVisible();
  });

  test("lead funnel widget visible", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.getByText("Lead Funnel")
    ).toBeVisible();

    await expect(
      page.getByText(/Enquiry to active student conversion/i)
    ).toBeVisible();
  });

  test("attendance heatmap visible", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.getByText("Attendance Heatmap")
    ).toBeVisible();

    await expect(
      page.getByText(/Last 6 months/i)
    ).toBeVisible();
  });

  test("analytics chat bubble visible", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.locator("button").filter({
        hasText: /AI|Analytics|Ask/i,
      }).first()
    ).toBeVisible();
  });

  test("dashboard refresh", async ({ page }) => {
    await openDashboard(page);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /^Dashboard$/,
      })
    ).toBeVisible();
  });

  test("dashboard has no loading skeleton after load", async ({ page }) => {
    await openDashboard(page);

    await expect(
      page.getByText(/Loading chart/i)
    ).toHaveCount(0);

    await expect(
      page.getByText(/^Loading\.\.\.$/)
    ).toHaveCount(0);
  });

  test("navigate from sidebar", async ({ page }) => {
    await page.goto("/students");

    await page.getByRole("link", {
      name: /^Dashboard$/,
    }).click();

    await expect(page).toHaveURL(/dashboard/);

    await expect(
      page.getByRole("heading", {
        name: /^Dashboard$/,
      })
    ).toBeVisible();
  });
});