import { test, expect, Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await expect(page).toHaveURL(/login/);

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", {
    name: /sign in|login/i,
  }).click();

  await page.waitForURL(/dashboard/);

  await expect(page).toHaveURL(/dashboard/);
}

async function openLeadProfile(page: Page) {
  await login(page);

  await page.goto("/leads");

  await page.waitForLoadState("networkidle");

  await page
    .locator('[data-testid^="lead-view-"]')
    .first()
    .click();

  await expect(
    page.getByRole("button", {
      name: /View Full Profile/i,
    })
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: /View Full Profile/i,
    })
    .click();
}

test.describe("Lead Profile", () => {

  test.beforeEach(async ({ page }) => {
    await openLeadProfile(page);
    await page.waitForLoadState("networkidle");
  });

  test("profile page opens", async ({ page }) => {
    await expect(page).toHaveURL(/\/leads\/.+/);
  });

  test("header visible", async ({ page }) => {
    await expect(page.getByRole("heading")).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Convert to Admission/i,
      })
    ).toBeVisible();
  });

 test("contact info card", async ({ page }) => {
  const card = page
    .locator("div")
    .filter({ has: page.getByText("Contact Info") })
    .first();

  await expect(card.getByText("Contact Info")).toBeVisible();

  await expect(
    card.locator("span").filter({ hasText: /^Email$/ })
  ).toBeVisible();

  await expect(
    card.locator("span").filter({ hasText: /^Phone$/ })
  ).toBeVisible();

  await expect(
    card.locator("span").filter({ hasText: /^Source$/ })
  ).toBeVisible();

  await expect(
    card.locator("span").filter({ hasText: /^Added$/ })
  ).toBeVisible();
});
  test("academic details card", async ({ page }) => {
    await expect(page.getByText("Academic Details")).toBeVisible();

    await expect(page.getByText("Course", { exact: true })).toBeVisible();
  });

  test("change stage section", async ({ page }) => {
    await expect(page.getByText("Change Stage")).toBeVisible();

    await expect(page.getByText("Contacted")).toBeVisible();
    await expect(page.getByText("Demo Scheduled")).toBeVisible();
    await expect(page.getByText("Demo Done")).toBeVisible();
  });

  test("activity timeline visible", async ({ page }) => {
    await expect(page.getByText("Activity Timeline")).toBeVisible();

    await expect(page.getByText("Log Activity")).toBeVisible();
  });

  test("activity buttons visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Call" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
  });

  test("textarea visible", async ({ page }) => {
    await expect(
      page.getByPlaceholder(/Add a note/i)
    ).toBeVisible();
  });

  test("log button disabled initially", async ({ page }) => {
    await expect(
  page.getByRole("button", { name: /Log/i })
).toBeDisabled();
  });

  test("can type note", async ({ page }) => {
    const textarea = page.getByPlaceholder(/Add a note/i);

    await textarea.fill("Playwright profile test");

    await expect(textarea).toHaveValue("Playwright profile test");
  });

});
