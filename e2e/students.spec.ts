import { test, expect, type Page } from "@playwright/test";

const LOGIN = {
  institute: process.env.TEST_INSTITUTE ?? "demo",
  email: process.env.TEST_EMAIL ?? "owner@demo.com",
  password: process.env.TEST_PASSWORD ?? "Admin@1234",
};

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(LOGIN.institute);
  await page.locator('input[name="email"]').fill(LOGIN.email);
  await page.locator('input[name="password"]').fill(LOGIN.password);

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

async function waitForStudentsPage(page: Page) {
  await page.goto("/students");

  if (page.url().includes("/login")) {
    throw new Error("Authentication failed. Redirected back to login.");
  }

  await expect(page).toHaveURL(/students/);

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      name: "Students",
    })
  ).toBeVisible({
    timeout: 15000,
  });

  const refreshButton = page.locator('button[title="Refresh"]');

  await expect(refreshButton).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Students", () => {
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

  test("open students page", async ({ page }) => {
    await waitForStudentsPage(page);

    await expect(
      page.getByRole("heading", {
        name: "Students",
      })
    ).toBeVisible();

    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test("refresh students list", async ({ page }) => {
    await waitForStudentsPage(page);

    const refreshButton = page.locator('button[title="Refresh"]');

    await Promise.all([
      page.waitForLoadState("networkidle"),
      refreshButton.click(),
    ]);

    await expect(refreshButton).toBeVisible();
  });

  test("open student profile", async ({ page }) => {
  await waitForStudentsPage(page);

  await page.getByRole("link", {
    name: "View profile",
  }).first().click();

  await expect(page).toHaveURL(/\/students\/[a-f0-9-]+$/);

  await expect(
    page.getByRole("button", {
      name: /Manage Batches/i,
    })
  ).toBeVisible();
});

test("navigate to attendance page", async ({ page }) => {
  await waitForStudentsPage(page);

  await page.getByRole("link", {
    name: "Attendance",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/attendance$/);

  await expect(
    page.getByRole("heading", {
      name: "Attendance",
    })
  ).toBeVisible();
});

test("navigate to exams page", async ({ page }) => {
  await waitForStudentsPage(page);

  await page.getByRole("link", {
    name: "Exams",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/exams$/);

  await expect(
    page.getByRole("heading", {
      name: "Exams",
    })
  ).toBeVisible();
});

test("navigate to fees page", async ({ page }) => {
  await waitForStudentsPage(page);

  await page.getByRole("link", {
    name: "Fees",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/fees$/);

  await expect(
    page.getByRole("heading", {
      name: "Fee Management",
    })
  ).toBeVisible();
});

});