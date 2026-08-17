import { test, expect } from "@playwright/test";

test("browser opens", async ({ page }) => {
  await page.goto("http://localhost:3000/login");

  await expect(
    page.getByRole("button", { name: /sign in/i })
  ).toBeVisible();

  console.log("URL:", page.url());
  console.log("TITLE:", await page.title());
});