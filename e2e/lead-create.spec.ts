import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead } from "./utils/leads";

test.describe("Lead Creation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Owner can create a new lead", async ({ page }) => {
    const lead = await createLead(page);

    const row = page.locator("tr").filter({
      hasText: lead.name,
    });

    await expect(row).toBeVisible();
    await expect(row).toContainText(lead.name);
    await expect(row).toContainText(lead.phone);

    // If your table displays email, keep this
    await expect(row).toContainText(lead.email);
  });

  test("Lead appears after page refresh", async ({ page }) => {
    const lead = await createLead(page);

    await page.reload();
    await page.waitForLoadState("networkidle");

    const row = page.locator("tr").filter({
      hasText: lead.name,
    });

    await expect(row).toBeVisible();
  });
});