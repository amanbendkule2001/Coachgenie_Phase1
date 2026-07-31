import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead, openLead } from "./utils/leads";

test.describe("Admission Payment", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Verify payment information on admission", async ({ page }) => {
    // Create lead
    const lead = await createLead(page);

    // Convert to admission
    await openLead(page, lead.name);

    await page.getByRole("button", {
      name: /Convert to Admission/i,
    }).click();

    await page.waitForLoadState("networkidle");

    // Open admission
    await page.goto("/admissions");

    const card = page
      .locator('[data-testid^="admission-card-"]')
      .filter({
        hasText: lead.name,
      });

    await expect(card).toBeVisible();

    await card.click();

    await expect(page).toHaveURL(/\/admissions\/.+/);

    // Verify fee values
   const feeCard = page.locator("div").filter({
  hasText: "Fee Summary",
}).first();

await expect(feeCard).toBeVisible();

await expect(feeCard).toContainText("Total Fee");
await expect(feeCard).toContainText("Fee Paid");
await expect(feeCard).toContainText("Outstanding");

await expect(feeCard).toContainText("₹0");

    // Verify pending status
    await expect(
      page.getByText(/Pending/i).first()
    ).toBeVisible();

    console.log("✅ Payment information verified.");
  });
});