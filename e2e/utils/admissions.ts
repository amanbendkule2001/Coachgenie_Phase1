import { expect, Page } from "@playwright/test";

export async function openAdmissions(page: Page) {
  await page.goto("/admissions");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveURL(/admissions/);
}

export async function searchAdmission(page: Page, studentName: string) {
  const searchBox = page
    .locator('input[placeholder*="Search"]')
    .or(page.locator('input[type="search"]'))
    .first();

  if (await searchBox.isVisible()) {
    await searchBox.fill(studentName);
    await page.waitForTimeout(500);
  }
}

export async function openAdmission(page: Page, studentName: string) {
  const row = page.locator("tr").filter({
    hasText: studentName,
  });

  await expect(row).toBeVisible();

  const viewButton = row.locator(
    '[data-testid^="admission-view-"]'
  );

  if (await viewButton.count()) {
    await viewButton.click();
  } else {
    await row.click();
  }

  await page.waitForLoadState("networkidle");
}