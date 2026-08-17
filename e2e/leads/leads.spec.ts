import { test, expect } from "@playwright/test";
import { loginAsOwner } from "../helpers/auth";

test.describe("Leads", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);

    await page.getByRole("link", {
      name: "Leads",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/leads/);
  });

  test("Leads page loads", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /Leads/i,
      })
    ).toBeVisible();
  });

  test("Add Lead button visible", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: /Add Lead/i,
      })
    ).toBeVisible();
  });

  test("table renders", async ({ page }) => {
    await expect(
      page.getByRole("table")
    ).toBeVisible();
  });

 test("table has headers", async ({ page }) => {
  const headers = [
    "Student",
    "Phone",
    "Grade",
    "Board",
    "Batch",
    "Course",
    "Source",
    "Stage",
    "Date",
  ];

  for (const header of headers) {
    await expect(
      page.getByText(header, { exact: true })
    ).toBeVisible();
  }
});

  test("page has no NaN", async ({ page }) => {
    await expect(
      page.locator("body")
    ).not.toContainText("NaN");
  });

  test("page has no undefined", async ({ page }) => {
    await expect(
      page.locator("body")
    ).not.toContainText("undefined");
  });

  test("refresh keeps Leads page", async ({ page }) => {
    await page.reload();

    await expect(page).toHaveURL(/leads/);

    await expect(
      page.getByRole("heading", {
        name: /Leads/i,
      })
    ).toBeVisible();
  });

test("search input is visible", async ({ page }) => {
  await expect(
    page.getByPlaceholder("Search leads…")
  ).toBeVisible();
});



test("clearing search restores table", async ({ page }) => {
  const search = page.getByPlaceholder("Search leads…");

  await search.fill("THIS_LEAD_DOES_NOT_EXIST_12345");
  await search.clear();

  await expect(
    page.getByRole("table")
  ).toBeVisible();
});

test("view button exists for first lead", async ({ page }) => {
  const viewButton = page.locator(
    '[data-testid^="lead-view-"]'
  ).first();

  await expect(viewButton).toBeVisible();
});





test("delete button exists", async ({ page }) => {
  await expect(
    page.locator('[data-testid^="lead-delete-"]').first()
  ).toBeVisible();
});

test("refresh keeps leads page", async ({ page }) => {
  await page.reload();

  await expect(page).toHaveURL(/leads/);

  await expect(
    page.getByRole("heading", {
      name: /Leads/i,
    })
  ).toBeVisible();
});

test("page contains no javascript errors", async ({ page }) => {
  const errors: string[] = [];

  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.reload();

  expect(errors).toEqual([]);
});

test("search unknown lead shows empty state", async ({ page }) => {
 await expect(page.getByTestId("lead-search")).toBeVisible();

await page.getByTestId("lead-search").fill(
  "THIS_LEAD_DOES_NOT_EXIST_12345"
);

  await expect(
    page.getByRole("table")
  ).toBeVisible();

  await expect(
    page.locator('[data-testid="lead-row"]')
  ).toHaveCount(0);
});



test("opening lead drawer works", async ({ page }) => {
  await page
    .locator('[data-testid^="lead-view-"]')
    .first()
    .click();

  await expect(
    page.getByTestId("lead-drawer")
  ).toBeVisible();
});

test("closing lead drawer works", async ({ page }) => {
  await page
    .locator('[data-testid^="lead-view-"]')
    .first()
    .click();

  await page
    .getByTestId("lead-backdrop")
    .click();

  await expect(
    page.getByTestId("lead-drawer")
  ).toHaveCount(0);
});



});






