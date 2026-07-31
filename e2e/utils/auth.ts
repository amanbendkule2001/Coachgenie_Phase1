// import { expect, Page } from "@playwright/test";


// const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
// const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
// const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

// export async function login(page: Page) {
//   await page.goto("/login");

//   await expect(page.locator('input[name="institute"]')).toBeVisible();

//   await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
//   await page.locator('input[name="email"]').fill(TEST_EMAIL);
//   await page.locator('input[name="password"]').fill(TEST_PASSWORD);

//   await page.getByRole("button", {
//     name: /sign in|login/i,
//   }).click();

//   // Wait for network to settle
//   await page.waitForLoadState("networkidle");

//   console.log("Current URL:", page.url());

//   // If still on login, print the page content for debugging
//   if (page.url().includes("/login")) {
//     console.log(await page.locator("body").innerText());
//   }

//   await expect(page).not.toHaveURL(/login/);
// }

// export async function openLeadProfile(page: Page) {
//   await login(page);

//   await page.goto("/leads");
//   await page.waitForLoadState("networkidle");

//   await page
//     .locator('[data-testid^="lead-view-"]')
//     .first()
//     .click();

//   await page.getByRole("button", {
//     name: /View Full Profile/i,
//   }).click();

//   await page.waitForLoadState("networkidle");
// }



import { expect, Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

export async function login(page: Page) {
  await page.goto("/login");

  await expect(
    page.locator('input[name="institute"]')
  ).toBeVisible();

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  // Wait for the login API request
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/auth/login") &&
      response.request().method() === "POST",
    {
      timeout: 30000,
    }
  );

  await page.getByRole("button", {
    name: /sign in|login/i,
  }).click();

  const response = await loginResponse;

  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Login failed (${response.status()})\n${body}`
    );
  }

  // Wait until redirected
  await page.waitForURL(/dashboard/, {
    timeout: 30000,
  });

  await expect(page).toHaveURL(/dashboard/);

  await page.waitForLoadState("networkidle");
}

export async function openLeadProfile(page: Page) {
  await login(page);

  await page.goto("/leads");

  await page.waitForLoadState("networkidle");

  const firstLead = page
    .locator('[data-testid^="lead-view-"]')
    .first();

  await expect(firstLead).toBeVisible();

  await firstLead.click();

  await page.getByRole("button", {
    name: /View Full Profile/i,
  }).click();

  await page.waitForURL(/\/leads\/.+/, {
    timeout: 30000,
  });

  await page.waitForLoadState("networkidle");
}