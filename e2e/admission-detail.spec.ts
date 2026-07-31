// import { test, expect } from "@playwright/test";
// import { login } from "./utils/auth";

// test.describe("Admission Detail", () => {
//   test.beforeEach(async ({ page }) => {
//     await login(page);

//     await page.goto("/admissions");

//     await page.waitForLoadState("networkidle");
//   });

//  test("check admissions list", async ({ page }) => {
//   await page.goto("/admissions");
//   await page.waitForLoadState("networkidle");

//   await page.screenshot({ path: "admissions.png", fullPage: true });

//   console.log(await page.locator("body").innerText());
// });
// });


import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead, openLead } from "./utils/leads";

test.describe("Admission Detail", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Open converted admission details", async ({ page }) => {
    // Step 1: Create a new lead
    const lead = await createLead(page);

    // Step 2: Open the lead
    await openLead(page, lead.name);

    // Step 3: Convert to Admission
    const convertButton = page.getByRole("button", {
      name: /Convert to Admission/i,
    });

    await expect(convertButton).toBeVisible();

    const convertResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admissions")
    );

    await convertButton.click();

    const response = await convertResponse;

    expect(response.status()).toBe(201);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Step 4: Open Admissions page
    await page.goto("/admissions");
    await page.waitForLoadState("networkidle");

    // Step 5: Verify student appears
    const admissionCard = page
      .locator('[data-testid^="admission-card-"]')
      .filter({
        hasText: lead.name,
      });

    await expect(admissionCard).toBeVisible();

    // Step 6: Open Detail page
    await admissionCard.click();

    // Step 7: Verify URL
    await expect(page).toHaveURL(/\/admissions\/.+/);

    // Step 8: Verify student name
    await expect(
      page.getByText(lead.name, { exact: false })
    ).toBeVisible();

    // Step 9: Verify status badge
    // await expect(
    //   page.getByText(
    //     /Pending Docs|Confirmed|Fee Pending|Docs Submitted/i
    //   )
    // ).toBeVisible();
    const statusBadge = page
  .locator("span")
  .filter({
    hasText: /Pending Docs|Confirmed|Fee Pending|Docs Submitted/i,
  })
  .first();

await expect(statusBadge).toBeVisible();

    // Step 10: Verify Documents section
   await expect(
  page.getByRole("heading", {
    name: "Documents",
  })
).toBeVisible();

    // Step 11: Verify Payment section
 await expect(
  page.getByText(/₹|Fee|Amount/i).first()
).toBeVisible();

    console.log("✅ Admission Detail page verified successfully.");
  });
});