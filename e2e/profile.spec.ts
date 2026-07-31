import { test, expect, type Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", {
    name: /sign in/i,
  }).click();

  await page.waitForURL(/dashboard/);
}

async function openProfile(page: Page) {
  await page.goto("/profile");

  await expect(
    page.getByRole("heading", {
      name: /^Profile$/,
    })
  ).toBeVisible();
}

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("profile page loads", async ({ page }) => {
    await openProfile(page);

    await expect(
      page.getByRole("button", {
        name: /Save Changes/i,
      })
    ).toBeVisible();
  });

  test("all fields are visible", async ({ page }) => {
    await openProfile(page);

    await expect(page.getByText("First Name")).toBeVisible();
    await expect(page.getByText("Last Name")).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Phone")).toBeVisible();
    await expect(page.getByText("Role")).toBeVisible();
  });

  test("email field is readonly", async ({ page }) => {
  await openProfile(page);

  const email = page
    .locator("label:text('Email')")
    .locator("..")
    .locator("input");

  await expect(email).toBeDisabled();
});

  test("role field is readonly", async ({ page }) => {
  await openProfile(page);

  const role = page
    .locator("label:text('Role')")
    .locator("..")
    .locator("input");

  await expect(role).toBeDisabled();
});



  test("update last name", async ({ page }) => {
    await openProfile(page);

    const last = page.locator("input").nth(1);

    await last.clear();

    await last.fill("Tester");

    await page.getByRole("button", {
      name: /Save Changes/i,
    }).click();

    await expect(
      page.getByText(/Profile updated/i)
    ).toBeVisible();
  });

  test("update phone", async ({ page }) => {
  await openProfile(page);

  const phone = page
    .locator("label", { hasText: "Phone" })
    .locator("xpath=..")
    .locator("input");

  await expect(phone).toBeEditable();

  await phone.fill("9876543210");

  await page.getByRole("button", {
    name: /Save Changes/i,
  }).click();

  await expect(
    page.getByText(/Profile updated/i)
  ).toBeVisible();
});

 test("save profile", async ({ page }) => {
  await openProfile(page);

  await page.getByRole("button", {
    name: /Save Changes/i,
  }).click();

  await expect(
    page.getByRole("heading", {
      name: /^Profile$/,
    })
  ).toBeVisible();
});

  test("profile refresh", async ({ page }) => {
    await openProfile(page);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /^Profile$/,
      })
    ).toBeVisible();
  });

test("direct navigation to profile", async ({ page }) => {
  await page.goto("/profile");

  await expect(
    page.getByRole("heading", {
      name: /^Profile$/,
    })
  ).toBeVisible();
});



});