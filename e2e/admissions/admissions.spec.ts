// import { test, expect } from "@playwright/test";
// import { loginAsOwner } from "../helpers/auth";

// test.describe("Admissions", () => {
//   test.beforeEach(async ({ page }) => {
//     await loginAsOwner(page);

//     await page.getByRole("link", {
//       name: "Admissions",
//       exact: true,
//     }).click();

//     await expect(page).toHaveURL(/admissions/);
//   });

//   test("Admissions page loads", async ({ page }) => {
//     await expect(
//       page.getByRole("heading", {
//         name: /Admissions/i,
//       })
//     ).toBeVisible();
//   });

//   test("Add Admission button visible", async ({ page }) => {
//     await expect(
//       page.getByTestId("add-admission")
//     ).toBeVisible();
//   });

//   test("Admission cards render", async ({ page }) => {
//     await expect(
//       page.locator('[data-testid^="admission-card-"]').first()
//     ).toBeVisible();
//   });

//   test("Refresh keeps Admissions page", async ({ page }) => {
//     await page.reload();

//     await expect(page).toHaveURL(/admissions/);

//     await expect(
//       page.getByRole("heading", {
//         name: /Admissions/i,
//       })
//     ).toBeVisible();
//   });

//   test("No NaN on page", async ({ page }) => {
//     await expect(page.locator("body")).not.toContainText("NaN");
//   });

//   test("No undefined on page", async ({ page }) => {
//     await expect(page.locator("body")).not.toContainText("undefined");
//   });

//   test("No javascript errors", async ({ page }) => {
//     const errors: string[] = [];

//     page.on("pageerror", err => {
//       errors.push(err.message);
//     });

//     await page.reload();

//     expect(errors).toEqual([]);
//   });

//   test("Open first admission", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await expect(page).toHaveURL(/admissions\/.+/);
//   });

//   test("Student information card visible", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await expect(
//       page.getByTestId("student-info-card")
//     ).toBeVisible();
//   });

//   test("Fee summary visible", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await expect(
//       page.getByTestId("fee-summary-card")
//     ).toBeVisible();
//   });

//   test("Documents card visible", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await expect(
//       page.getByTestId("documents-card")
//     ).toBeVisible();
//   });

//   test("Status stepper visible", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await expect(
//       page.getByTestId("admission-status-stepper")
//     ).toBeVisible();
//   });

//   test("Refresh button exists", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await expect(
//       page.getByTestId("refresh-admission")
//     ).toBeVisible();
//   });

//   test("Back button returns to admissions", async ({ page }) => {
//     await page
//       .locator('[data-testid^="admission-card-"]')
//       .first()
//       .click();

//     await page.getByRole("button").first().click();

//     await expect(page).toHaveURL(/admissions$/);
//   });
// });


import { test, expect } from "@playwright/test";
import { loginAsOwner } from "../helpers/auth";

test.describe("Admissions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);

    await page.getByRole("link", {
      name: "Admissions",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/admissions/);
  });

  test("Admissions page loads", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /Admissions/i,
      })
    ).toBeVisible();
  });

  test("Add Admission button visible", async ({ page }) => {
    await expect(
      page.getByTestId("add-admission")
    ).toBeVisible();
  });

  test("Admission cards render", async ({ page }) => {
    await expect(
      page.locator('[data-testid^="admission-card-"]').first()
    ).toBeVisible();
  });

  test("Refresh keeps Admissions page", async ({ page }) => {
    await page.reload();

    await expect(page).toHaveURL(/admissions/);

    await expect(
      page.getByRole("heading", {
        name: /Admissions/i,
      })
    ).toBeVisible();
  });

  test("No NaN on page", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("NaN");
  });

  test("No undefined on page", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("undefined");
  });

  test("No javascript errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", err => {
      errors.push(err.message);
    });

    await page.reload();

    expect(errors).toEqual([]);
  });

  test("Open first admission", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await expect(page).toHaveURL(/admissions\/.+/);
  });

  test("Student information card visible", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await expect(
      page.getByTestId("student-info-card")
    ).toBeVisible();
  });

  test("Fee summary visible", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await expect(
      page.getByTestId("fee-summary-card")
    ).toBeVisible();
  });

  test("Documents card visible", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await expect(
      page.getByTestId("documents-card")
    ).toBeVisible();
  });

  test("Status stepper visible", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await expect(
      page.getByTestId("admission-status-stepper")
    ).toBeVisible();
  });

  test("Refresh button exists", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await expect(
      page.getByTestId("refresh-admission")
    ).toBeVisible();
  });

  test("Back button returns to admissions", async ({ page }) => {
    await page
      .locator('[data-testid^="admission-card-"]')
      .first()
      .click();

    await page.getByTestId("back-to-admissions").click();

    await expect(page).toHaveURL(/admissions$/);
  });
});