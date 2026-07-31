import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";

test.describe("Admission Search", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    await page.goto("/admissions");

    await page.waitForLoadState("networkidle");
  });

  test("Search box is visible", async ({ page }) => {
    const searchBox = page
      .locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('input[placeholder*="search"]'))
      .first();

    await expect(searchBox).toBeVisible();
  });

  test("Search returns results", async ({ page }) => {
    const searchBox = page
      .locator('input[type="search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('input[placeholder*="search"]'))
      .first();

    await searchBox.fill("A");

    await page.waitForTimeout(500);

    await expect(
      page.locator("table")
    ).toBeVisible();
  });
});