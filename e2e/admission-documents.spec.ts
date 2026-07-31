import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead, openLead } from "./utils/leads";

test.describe("Admission Documents", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Verify document checklist", async ({ page }) => {
    const lead = await createLead(page);

    await openLead(page, lead.name);

    await page.getByRole("button", {
      name: /Convert to Admission/i,
    }).click();

    await page.waitForLoadState("networkidle");

    await page.goto("/admissions");

    const card = page
      .locator('[data-testid^="admission-card-"]')
      .filter({ hasText: lead.name });

    await expect(card).toBeVisible();

    await card.click();

    await expect(
      page.getByRole("heading", {
        name: "Documents",
      })
    ).toBeVisible();

    await expect(
      page.getByText("Aadhar Card")
    ).toBeVisible();

    await expect(
      page.getByText("Previous Marksheet")
    ).toBeVisible();

    await expect(
      page.getByText("Passport Photo")
    ).toBeVisible();

    console.log("✅ Documents verified");
  });
});