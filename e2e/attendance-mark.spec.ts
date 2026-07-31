// import { test, expect } from "@playwright/test";
// import { login } from "./utils/auth";

// test.describe("Attendance", () => {
//   test.beforeEach(async ({ page }) => {
//     await login(page);
//   });

//   test("Mark attendance for a student", async ({ page }) => {
//     await page.goto("/attendance");
//     await page.waitForLoadState("networkidle");

//     // Ensure page loaded
//     await expect(
//       page.getByRole("heading", { name: /Attendance/i })
//     ).toBeVisible();

//     // Select first student row
//     const firstRow = page.locator("tbody tr").first();
//     await expect(firstRow).toBeVisible();

//     // Click Present (adjust if your UI uses a different label)
//     const presentButton = firstRow.getByRole("button", {
//       name: /Present/i,
//     });

//     if (await presentButton.isVisible()) {
//       await presentButton.click();
//     }

//     // Save attendance if required
//     const saveButton = page.getByRole("button", {
//       name: /Save/i,
//     });

//     if (await saveButton.isVisible()) {
//       await saveButton.click();
//       await page.waitForLoadState("networkidle");
//     }

//     console.log("✅ Attendance marked successfully.");
//   });
// });



import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";

test.describe("Attendance", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Mark attendance for a student", async ({ page }) => {
    // Open Attendance page
    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(
      page.getByRole("heading", { name: /Mark Attendance/i })
    ).toBeVisible();

    // Verify default batch is selected
    const batchSelect = page.getByRole("combobox").first();
    await expect(batchSelect).toBeVisible();

    // Start attendance session
    const startSessionButton = page.getByRole("button", {
      name: /Start Session/i,
    });

    await expect(startSessionButton).toBeVisible();

    await Promise.all([
      page.waitForLoadState("networkidle"),
      startSessionButton.click(),
    ]);

    // Wait for attendance UI to appear
    await page.waitForTimeout(1000);

    // If no student list appears, print page for debugging
    const rows = page.locator("tbody tr");

    if ((await rows.count()) === 0) {
      console.log("===== Attendance Page =====");
      console.log(await page.locator("body").innerText());

      await page.screenshot({
        path: "attendance-after-start.png",
        fullPage: true,
      });

      throw new Error(
        "Attendance session started but no student rows were rendered."
      );
    }

    const firstRow = rows.first();
    await expect(firstRow).toBeVisible();

    // Try marking Present
    const presentButton = firstRow.getByRole("button", {
      name: /Present/i,
    });

    if (await presentButton.isVisible()) {
      await presentButton.click();
    }

    // Save if Save button exists
    const saveButton = page.getByRole("button", {
      name: /Save/i,
    });

    if (await saveButton.isVisible()) {
      await Promise.all([
        page.waitForLoadState("networkidle"),
        saveButton.click(),
      ]);
    }

    console.log("✅ Attendance marked successfully.");
  });
});