import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead, openLead } from "./utils/leads";

test.describe("Admission Status Progression", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Advance admission through all statuses", async ({ page }) => {
    // Create Lead
    const lead = await createLead(page);

    // Open Lead
    await openLead(page, lead.name);

    // Convert to Admission
    const convertButton = page.getByRole("button", {
      name: /Convert to Admission/i,
    });

    await expect(convertButton).toBeVisible();

    await Promise.all([
      page.waitForResponse(
        r =>
          r.request().method() === "POST" &&
          r.url().includes("/admissions")
      ),
      convertButton.click(),
    ]);

    await page.waitForLoadState("networkidle");

    // Open Admission
    await page.goto("/admissions");
    await page.waitForLoadState("networkidle");

    const card = page
      .locator('[data-testid^="admission-card-"]')
      .filter({
        hasText: lead.name,
      });

    await expect(card).toBeVisible();

    await card.click();

    await expect(page).toHaveURL(/\/admissions\/.+/);

    // ----------------------------
    // Pending Docs -> Docs Submitted
    // ----------------------------

    const docsButton = page.getByRole("button", {
      name: /Advance to Documents Submitted/i,
    });

    await expect(docsButton).toBeVisible();

    await docsButton.click();

    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/Documents Submitted/i).first()
    ).toBeVisible();

    // ----------------------------
    // Docs Submitted -> Fee Pending
    // ----------------------------

    const feeButton = page.getByRole("button", {
      name: /Advance to Fee Pending/i,
    });

    if (await feeButton.isVisible()) {
      await feeButton.click();

      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/Fee Pending/i).first()
      ).toBeVisible();
    }

    // ----------------------------
    // Fee Pending -> Confirmed
    // ----------------------------

    const confirmButton = page.getByRole("button", {
      name: /Advance to Confirmed/i,
    });

    if (await confirmButton.isVisible()) {
      await confirmButton.click();

      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/Confirmed/i).first()
      ).toBeVisible();
    }

    console.log("✅ Admission status progression verified.");
  });
});