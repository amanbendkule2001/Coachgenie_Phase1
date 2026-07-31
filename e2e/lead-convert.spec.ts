// import { test, expect } from "@playwright/test";
// import { login } from "./utils/auth";
// import { createLead, openLead } from "./utils/leads";

// test.describe("Lead Conversion", () => {
//   test.beforeEach(async ({ page }) => {
//     await login(page);
//   });

//   test("convert button is visible for a new lead", async ({ page }) => {
//     const lead = await createLead(page);

//     await openLead(page, lead.name);

//     await expect(
//       page.getByRole("button", {
//         name: /Convert to Admission/i,
//       })
//     ).toBeVisible();
//   });

// test("convert lead to admission", async ({ page }) => {
//   const lead = await createLead(page);

//   await openLead(page, lead.name);

//   const convertButton = page.getByRole("button", {
//     name: /Convert to Admission/i,
//   });

//   await expect(convertButton).toBeVisible();

//   await convertButton.click();

//   await page.waitForLoadState("networkidle");

//   // TODO: Fill admission form if one appears

//   // Verify convert button disappears after successful conversion
//   await expect(convertButton).toBeHidden();
// });
// });


import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { createLead, openLead } from "./utils/leads";

test.describe("Lead Conversion", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Convert lead creates admission", async ({ page }) => {
    // Create a fresh lead
    const lead = await createLead(page);

    // Open the created lead
    await openLead(page, lead.name);

    // Verify convert button exists
    const convertButton = page.getByRole("button", {
      name: /Convert to Admission/i,
    });

    await expect(convertButton).toBeVisible();

    // Listen for admission API request (optional but useful)
    const admissionRequest = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admissions")
    ).catch(() => null);

    // Click convert
    await convertButton.click();

    // Wait for UI/network to settle
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Log API response if it exists
    const response = await admissionRequest;

    if (response) {
      console.log("Admission API Status:", response.status());

      try {
        console.log(await response.text());
      } catch {
        console.log("Unable to read response body.");
      }
    } else {
      console.log("No POST /admissions request detected.");
    }

    // Open admissions page
    await page.goto("/admissions");
    await page.waitForLoadState("networkidle");

    // Verify admission exists
    await expect(
      page.getByText(lead.name, { exact: false })
    ).toBeVisible();
  });
});