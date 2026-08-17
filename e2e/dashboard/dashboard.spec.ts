import { test, expect } from "@playwright/test";
import { loginAsOwner } from "../helpers/auth";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("dashboard heading is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Dashboard/i })
    ).toBeVisible();
  });

  test("welcome message is displayed", async ({ page }) => {
    await expect(
      page.getByText(/Welcome back/i)
    ).toBeVisible();
  });

  test("Total Students card is visible", async ({ page }) => {
    await expect(
      page.getByText("Total Students")
    ).toBeVisible();
  });

  test("Active Batches card is visible", async ({ page }) => {
    await expect(
      page.getByText("Active Batches")
    ).toBeVisible();
  });

  test("Fee Collected card is visible", async ({ page }) => {
    await expect(
      page.getByText("Fee Collected")
    ).toBeVisible();
  });

  test("Attendance Rate card is visible", async ({ page }) => {
    await expect(
      page.getByText("Attendance Rate")
    ).toBeVisible();
  });

  test("Fee Collection chart is visible", async ({ page }) => {
    await expect(
      page.getByText("Fee Collection")
    ).toBeVisible();
  });

  test("Lead Funnel chart is visible", async ({ page }) => {
    await expect(
      page.getByText("Lead Funnel")
    ).toBeVisible();
  });

  test("Attendance Heatmap is visible", async ({ page }) => {
    await expect(
      page.getByText("Attendance Heatmap")
    ).toBeVisible();
  });

  test("AI Copilot section is visible", async ({ page }) => {
    await expect(
      page.getByText("AI Copilot")
    ).toBeVisible();
  });

  test("dashboard contains no NaN", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("NaN");
  });

  test("dashboard contains no undefined", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("undefined");
  });

  test("dashboard refresh works", async ({ page }) => {
    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /Dashboard/i,
      })
    ).toBeVisible();
  });

  test("dashboard has no horizontal overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(overflow).toBeFalsy();
  });

  test("dashboard KPI values are rendered", async ({ page }) => {
    const cards = page.locator("text=/Total Students|Active Batches|Fee Collected|Attendance Rate/");

    await expect(cards).toHaveCount(4);
  });
});