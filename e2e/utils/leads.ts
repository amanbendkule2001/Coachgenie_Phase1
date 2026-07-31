import { expect, Page } from "@playwright/test";

/**
 * Creates a new lead using the UI.
 * Returns the generated lead name.
 */
export async function createLead(page: Page) {
  const ts = Date.now();

  const lead = {
    name: `PW Lead ${ts}`,
    email: `pw${ts}@test.com`,
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    grade: "12",
    subject: "NEET",
  };

  await page.goto("/leads");

  await page.waitForLoadState("networkidle");

  await page.getByRole("button", {
    name: /Add Lead/i,
  }).click();

  await expect(
    page.getByTestId("add-lead-modal")
  ).toBeVisible();

  await page.locator('input[name="name"]').fill(lead.name);

  await page.locator('input[name="email"]').fill(lead.email);

  await page.locator('input[name="phone"]').fill(lead.phone);

  await page.locator('input[name="grade"]').fill(lead.grade);

  await page.locator('input[name="subject"]').fill(lead.subject);

  await page.getByTestId("lead-form-submit").click();

  await page.waitForLoadState("networkidle");

  await expect(page.getByText(lead.name)).toBeVisible();

  return lead;
}

/**
 * Opens a lead from the table.
 */
export async function openLead(
  page: Page,
  leadName: string
) {
  const row = page.locator("tr").filter({
    hasText: leadName,
  });

  await expect(row).toBeVisible();

  await row
    .locator('[data-testid^="lead-view-"]')
    .click();

  await page.getByRole("button", {
    name: /View Full Profile/i,
  }).click();

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      name: leadName,
    })
  ).toBeVisible();
}

/**
 * Deletes a lead from the profile page.
 */
export async function deleteLead(page: Page) {
  await page
    .getByRole("button")
    .filter({
      has: page.locator("svg"),
    })
    .last()
    .click();

  await page.waitForLoadState("networkidle");
}