import { test, expect } from "@playwright/test";
import { loginAsOwner } from "../helpers/auth";

test.describe("Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("sidebar is visible", async ({ page }) => {
    await expect(page.getByTestId("sidebar")).toBeVisible();
  });

  test("logo is visible", async ({ page }) => {
    await expect(page.getByText("CoachGenie")).toBeVisible();
  });

  test("collapse button is visible", async ({ page }) => {
    await expect(
      page.getByTestId("sidebar-collapse")
    ).toBeVisible();
  });

  test("collapse sidebar", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar");

    await page.getByTestId("sidebar-collapse").click();

    await expect(sidebar).toHaveClass(/w-16/);

    await expect(
      page.getByText("CoachGenie")
    ).toHaveCount(0);
  });

 test("expand sidebar", async ({ page }) => {
  const collapse = page.getByTestId("sidebar-collapse");

  // Collapse
  await collapse.click();

  await expect(page.getByText("CoachGenie")).toHaveCount(0);

  // Wait for animation to finish
  await page.waitForTimeout(300);

  // Expand
  await collapse.click();

  await expect(page.getByText("CoachGenie")).toBeVisible();
});

  test("icons remain after collapse", async ({ page }) => {
    await page.getByTestId("sidebar-collapse").click();

    const icons = page
      .getByTestId("sidebar")
      .locator("svg");

    await expect(icons.first()).toBeVisible();
  });

  test("Dashboard menu visible", async ({ page }) => {
    await expect(
      page.getByRole("link", {
        name: "Dashboard",
        exact: true,
      })
    ).toBeVisible();
  });

  test("Students menu visible", async ({ page }) => {
    await expect(
      page.getByRole("link", {
        name: "Students",
        exact: true,
      })
    ).toBeVisible();
  });

  test("Leads menu visible", async ({ page }) => {
    await expect(
      page.getByRole("link", {
        name: "Leads",
        exact: true,
      })
    ).toBeVisible();
  });

  test("Fees menu visible", async ({ page }) => {
    await expect(
      page.getByRole("link", {
        name: "Fees",
        exact: true,
      })
    ).toBeVisible();
  });

  test("Career Guidance opens new tab", async ({ page }) => {
    const link = page.getByRole("link", {
      name: /Career Guidance/i,
    });

    await expect(link).toHaveAttribute(
      "target",
      "_blank"
    );

    await expect(link).toHaveAttribute(
      "rel",
      /noopener/
    );
  });

  test("Dashboard menu active", async ({ page }) => {
    const dashboard = page.getByRole("link", {
      name: "Dashboard",
      exact: true,
    });

    await expect(dashboard).toHaveClass(/bg-primary\/10/);
  });
});