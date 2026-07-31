import { test, expect, type Page, type APIResponse } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);

  await expect(page).toHaveURL(/dashboard/);

  await expect(async () => {
    const cookies = await page.context().cookies();
    const names = cookies.map((c) => c.name);

    expect(names).toContain("cg_access_token");
    expect(names).toContain("cg_refresh_token");
  }).toPass({
    timeout: 10000,
  });
}

async function waitForAdmissionsPage(page: Page) {
  await page.goto("/admissions");

  if (page.url().includes("/login")) {
    throw new Error(
      "Authentication failed. Redirected back to login."
    );
  }

  await expect(page).toHaveURL(/admissions/);

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      name: "Admissions",
    })
  ).toBeVisible({
    timeout: 15000,
  });

  const addButton = page.getByRole("button", {
    name: /Add Admission/i,
  });

  await expect(addButton).toBeVisible({
    timeout: 15000,
  });
}

async function createAdmission(
  page: Page,
  studentName: string
): Promise<APIResponse> {
  await waitForAdmissionsPage(page);

  await page
    .getByRole("button", {
      name: /Add Admission/i,
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: /Add New Admission/i,
    })
  ).toBeVisible();

  const email = `playwright.${Date.now()}@test.com`;

  //
  // Student Information
  //

  await page
    .getByPlaceholder("e.g. Arjun Verma")
    .fill(studentName);

  await page
    .getByPlaceholder("e.g. 12")
    .fill("12");

  await page
    .locator("select")
    .nth(0)
    .selectOption("CBSE");

  await page
    .getByPlaceholder("e.g. Delhi Public School")
    .fill("Playwright School");

  //
  // Batch
  //

  const batch = page.locator("select").nth(1);

  await expect(batch).toBeVisible();

  const optionCount = await batch.locator("option").count();

  if (optionCount > 1) {
    const value = await batch
      .locator("option")
      .nth(1)
      .getAttribute("value");

    if (value) {
      await batch.selectOption(value);
    }
  }

  //
  // Contact Details
  //

  await page
    .getByPlaceholder("e.g. 9876543210")
    .first()
    .fill("9876543210");

  await page
    .getByPlaceholder("e.g. arjun@gmail.com")
    .fill(email);

  await page
    .getByPlaceholder("e.g. Ramesh Verma")
    .fill("Playwright Parent");

  await page
    .getByPlaceholder("e.g. 9876543210")
    .nth(1)
    .fill("9876543211");

  //
  // Payment
  //

  await page
    .getByPlaceholder("50000")
    .fill("50000");

  await page
    .getByPlaceholder("20000")
    .fill("10000");

  const responsePromise = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/proxy/admissions") &&
      response.request().method() === "POST"
    );
  });

  await page
    .getByRole("button", {
      name: /Save Admission/i,
    })
    .scrollIntoViewIfNeeded();

  await page
    .getByRole("button", {
      name: /Save Admission/i,
    })
    .click();

  const response = await responsePromise;

  expect(response.ok()).toBeTruthy();

  await expect(
    page.getByText(studentName)
  ).toBeVisible({
    timeout: 15000,
  });

  return response;

  
}

test.describe("Admissions", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    page.on("pageerror", (err) => {
      testInfo.attach("pageerror", {
        body: String(err.stack ?? err),
        contentType: "text/plain",
      });
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        testInfo.attach("console-error", {
          body: msg.text(),
          contentType: "text/plain",
        });
      }
    });

    await login(page);
  });

  test("open admissions page", async ({ page }) => {
    await waitForAdmissionsPage(page);

    await expect(
      page.getByRole("heading", {
        name: "Admissions",
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Add Admission/i,
      })
    ).toBeVisible();
  });

  test("create admission", async ({ page }) => {
    const student = `Playwright Student ${Date.now()}`;

    const response = await createAdmission(page, student);

    expect(response.ok()).toBeTruthy();

    await expect(
      page.getByText(student)
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows validation when student name is empty", async ({ page }) => {
    await waitForAdmissionsPage(page);

    await page
      .getByRole("button", {
        name: /Add Admission/i,
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: /Add New Admission/i,
      })
    ).toBeVisible();

    // Leave Student Name empty intentionally

    await page
      .getByPlaceholder("e.g. arjun@gmail.com")
      .fill(`validation.${Date.now()}@test.com`);

    await page
      .getByPlaceholder("e.g. 9876543210")
      .first()
      .fill("9876543210");

    await page
      .getByPlaceholder("50000")
      .fill("50000");

    await page
      .getByPlaceholder("20000")
      .fill("10000");

    await page
      .getByRole("button", {
        name: /Save Admission/i,
      })
      .click();

    await expect(
      page.getByText(/Student name is required/i)
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("filter admissions by status", async ({ page }) => {
  const student = `Filter Student ${Date.now()}`;

  await createAdmission(page, student);

  // Make sure it exists in All
  await expect(page.getByText(student)).toBeVisible();

  // Click Pending Docs
  await page.getByText(/^Pending Docs/).click();

  await page.waitForLoadState("networkidle");

  // We expect the student NOT to be visible here
  await expect(page.getByText(student)).toHaveCount(0);

  // Click All (works even though it isn't a button)
  await page.getByText(/^All\s*\(/).click();

  await page.waitForLoadState("networkidle");

  // Student should be visible again
  await expect(page.getByText(student)).toBeVisible({
    timeout: 10000,
  });
});




test("open admission details", async ({ page }) => {
  const student = `Detail Student ${Date.now()}`;

  await createAdmission(page, student);

  const studentRow = page.getByText(student).first();

  await expect(studentRow).toBeVisible();

  await studentRow.click();

  await expect(page).toHaveURL(/\/admissions\/.+/);

  await expect(
    page.getByRole("button", {
      name: /Refresh/i,
    })
  ).toBeVisible({
    timeout: 10000,
  });
});

test("refresh admission details", async ({ page }) => {
  const student = `Refresh Student ${Date.now()}`;

  await createAdmission(page, student);

  await page.getByText(student).first().click();

  const refreshButton = page.getByRole("button", {
    name: /Refresh/i,
  });

  await expect(refreshButton).toBeVisible();

  await Promise.all([
    page.waitForLoadState("networkidle"),
    refreshButton.click(),
  ]);

  await expect(refreshButton).toBeVisible();
});

});