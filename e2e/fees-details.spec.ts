import { test, expect, Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", {
    name: /sign in|login/i,
  }).click();

  await page.waitForURL(/dashboard/, {
    timeout: 30000,
  });
}

async function openFirstInvoice(page: Page) {
  await login(page);

  await page.goto("/fees");

  await expect(
    page.getByRole("heading", {
      name: /Fee Management/i,
    })
  ).toBeVisible();

  const links = page.locator('a[href^="/fees/"]');

  await expect(links.first()).toBeVisible();

  await links.first().click();

  await expect(page).toHaveURL(/\/fees\/.+/);
}

test.describe("Fee Invoice Details", () => {
  test.beforeEach(async ({ page }) => {
    await openFirstInvoice(page);
  });

  test("invoice page loads", async ({ page }) => {
    await expect(
      page.getByRole("button").first()
    ).toBeVisible();
  });

  test("invoice summary card visible", async ({ page }) => {
    await expect(
      page.getByText("Invoice Summary")
    ).toBeVisible();
  });

  test("invoice information visible", async ({ page }) => {
    await expect(page.getByText("Invoice No")).toBeVisible();
    await expect(page.getByText("Due Date")).toBeVisible();
    await expect(page.getByText("Created")).toBeVisible();
    await expect(page.getByText("Status")).toBeVisible();
  });

  test("amount summary visible", async ({ page }) => {
    await expect(page.getByText("Invoice Amount")).toBeVisible();
    await expect(page.getByText("Paid")).toBeVisible();
    await expect(page.getByText("Outstanding")).toBeVisible();
    await expect(page.getByText("Progress")).toBeVisible();
  });

  test("payment history section visible", async ({ page }) => {
    await expect(
      page.getByText("Payment History")
    ).toBeVisible();
  });

  test("installment section handled", async ({ page }) => {
    const schedule = page.getByText("Installment Schedule");

    if (await schedule.count()) {
      await expect(schedule).toBeVisible();
    }
  });

  test("record payment button if available", async ({ page }) => {
    const button = page.getByRole("button", {
      name: /Record Payment/i,
    });

    if ((await button.count()) === 0) return;

    await button.click();

    await expect(
      page.getByText("Outstanding")
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Cancel",
      })
    ).toBeVisible();

   await expect(
  page.getByRole("button", {
    name: /Record Payment/i,
  }).last()
).toBeVisible();
  });

  test("cancel payment dialog", async ({ page }) => {
    const button = page.getByRole("button", {
      name: /Record Payment/i,
    });

    if ((await button.count()) === 0) return;

    await button.click();

    await page.getByRole("button", {
      name: "Cancel",
    }).click();

    await expect(
      page.getByText("Payment History")
    ).toBeVisible();
  });

  test("payment mode dropdown", async ({ page }) => {
    const button = page.getByRole("button", {
      name: /Record Payment/i,
    });

    if ((await button.count()) === 0) return;

    await button.click();

    const select = page.getByRole("combobox");

    await expect(select).toBeVisible();

    await select.selectOption("upi");

    await expect(select).toHaveValue("upi");
  });

  test("invalid payment amount", async ({ page }) => {
    const button = page.getByRole("button", {
      name: /Record Payment/i,
    });

    if ((await button.count()) === 0) return;

    await button.click();

    await page
      .locator('input[type="number"]')
      .fill("0");

    await page
      .getByRole("button", {
        name: /^Record Payment$/,
      })
      .last()
      .click();

    await expect(
      page.getByText(/valid amount/i)
    ).toBeVisible();
  });

  test("back navigation", async ({ page }) => {
  const backButton = page.locator("button").filter({
    has: page.locator("svg"),
  }).first();

  await backButton.click();

  await page.waitForURL("**/fees");

  await expect(page).toHaveURL(/\/fees$/);

  await expect(
    page.getByRole("heading", {
      name: /Fee Management/i,
    })
  ).toBeVisible();
});
});