import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";

test.describe("Admission List", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Admissions page loads successfully", async ({ page }) => {
    await page.goto("/admissions");

    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/admissions/);

    // Verify page heading
    await expect(
      page.getByRole("heading", {
        name: /Admissions/i,
      })
    ).toBeVisible();
  });
});