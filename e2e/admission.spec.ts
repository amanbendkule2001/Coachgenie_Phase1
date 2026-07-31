import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead, openLead } from "./utils/leads";
import { openAdmissions, searchAdmission } from "./utils/admissions";

test.describe("Admissions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("converted lead appears in admissions", async ({ page }) => {
    const lead = await createLead(page);

    await openLead(page, lead.name);

    const convertButton = page.getByRole("button", {
      name: /Convert to Admission/i,
    });

    await expect(convertButton).toBeVisible();

    await convertButton.click();

    await page.waitForLoadState("networkidle");

    await openAdmissions(page);

    await searchAdmission(page, lead.name);

    await expect(
      page.getByText(lead.name)
    ).toBeVisible();
  });
});