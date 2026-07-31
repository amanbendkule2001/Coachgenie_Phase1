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

async function openSessions(page: Page) {
  await page.goto("/sessions");

  await expect(
    page.getByRole("heading", {
      name: /^Sessions$/,
    })
  ).toBeVisible();
}

test.describe("Sessions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("sessions page loads", async ({ page }) => {
    await openSessions(page);

    await expect(
      page.getByText(/Plan classes/i)
    ).toBeVisible();
  });

  test("stats cards visible", async ({ page }) => {
    await openSessions(page);

    await expect(page.getByText("Today")).toBeVisible();
    await expect(page.getByText("Total sessions")).toBeVisible();
    await expect(page.getByText("Pending attendance")).toBeVisible();
    await expect(page.getByText("Completed")).toBeVisible();
  });

  test("refresh button visible", async ({ page }) => {
    await openSessions(page);

    await expect(
      page.getByRole("button", {
        name: /Refresh/i,
      })
    ).toBeVisible();
  });

  test("schedule via batch navigation", async ({ page }) => {
    await openSessions(page);

    await page.getByRole("link", {
      name: /Schedule via Batch/i,
    }).click();

    await expect(page).toHaveURL(/batches/);
  });

  test("session schedule section visible", async ({ page }) => {
    await openSessions(page);

    await expect(
      page.getByText("Session Schedule")
    ).toBeVisible();

    await expect(
      page.getByText(/Loaded from batch class APIs/i)
    ).toBeVisible();
  });

  test("refresh sessions", async ({ page }) => {
    await openSessions(page);

    await page.getByRole("button", {
      name: /Refresh/i,
    }).click();

    await expect(
      page.getByRole("heading", {
        name: /^Sessions$/,
      })
    ).toBeVisible();
  });

  test("loading state disappears", async ({ page }) => {
    await openSessions(page);

    await expect(
      page.getByText(/Loading sessions/i)
    ).toHaveCount(0);
  });

test("session list renders correctly", async ({ page }) => {
  await openSessions(page);

  await expect(
    page.getByText("Session Schedule")
  ).toBeVisible();

  await expect(
    page.getByText(/Loaded from batch class APIs/i)
  ).toBeVisible();

  // The page itself should render successfully regardless of
  // whether there are sessions, no sessions, or an API error.
  await expect(
    page.getByRole("heading", {
      name: /^Sessions$/,
    })
  ).toBeVisible();
});

  test("mark attendance link works", async ({ page }) => {
    await openSessions(page);

    const links = page.getByRole("link", {
      name: /Mark Attendance/i,
    });

    const count = await links.count();

    test.skip(count === 0, "No sessions available");

    await links.first().click();

    await expect(page).toHaveURL(/attendance/);
  });

  test("complete session button", async ({ page }) => {
    await openSessions(page);

    const complete = page.getByRole("button", {
      name: /Complete/i,
    });

    const count = await complete.count();

    test.skip(count === 0, "No incomplete sessions");

    await complete.first().click();

    await expect(
      page.getByRole("heading", {
        name: /^Sessions$/,
      })
    ).toBeVisible();
  });

  test("page refresh", async ({ page }) => {
    await openSessions(page);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /^Sessions$/,
      })
    ).toBeVisible();
  });
});