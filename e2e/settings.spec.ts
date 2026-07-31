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

async function openSettings(page: Page) {
  await page.goto("/settings");

  await expect(
    page.getByRole("heading", {
      name: /Institute Settings/i,
    })
  ).toBeVisible();
}

test.describe("Institute Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("settings page loads", async ({ page }) => {
    await openSettings(page);
  });

  test("all sections visible", async ({ page }) => {
    await openSettings(page);

    await expect(
  page.getByRole("heading", {
    name: "Institute Profile",
  })
).toBeVisible();
    await expect(
  page.getByRole("heading", {
    name: "Branding",
  })
).toBeVisible();

    await expect(
  page.getByRole("button", {
    name: "Upload Logo",
  })
).toBeVisible();
  });

  test("save changes button exists", async ({ page }) => {
    await openSettings(page);

    await expect(
      page.getByRole("button", {
        name: /Save Changes/i,
      })
    ).toBeVisible();
  });

  test("update institute name", async ({ page }) => {
    await openSettings(page);

    await page.locator('input[name="name"]').fill("CoachGenie QA");

    await page.getByRole("button", {
      name: /Save Changes/i,
    }).click();

    await expect(
      page.getByText(/Institute settings saved/i)
    ).toBeVisible();
  });

  test("upload logo button visible", async ({ page }) => {
    await openSettings(page);

    await expect(
      page.getByRole("button", {
        name: /Upload Logo/i,
      })
    ).toBeVisible();
  });

  test("page refresh", async ({ page }) => {
    await openSettings(page);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /Institute Settings/i,
      })
    ).toBeVisible();
  });
});