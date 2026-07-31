import { test, expect, Page } from "@playwright/test";

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
}

async function waitForBatchesPage(page: Page) {
  await page.goto("/batches");

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      name: "Batches",
    })
  ).toBeVisible();

  await expect(
    page.locator('button[title="Refresh"]')
  ).toBeVisible();
}

async function openFirstBatch(page: Page) {
  await waitForBatchesPage(page);

  await Promise.all([
    page.waitForURL(/\/batches\/.+/),
    page.getByRole("link", { name: "View Details" }).first().click(),
  ]);
}


test.describe("Batches", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("open batches page", async ({ page }) => {
    await waitForBatchesPage(page);

    await expect(
      page.getByText(/total batches/i)
    ).toBeVisible();
  });

  test("refresh batches", async ({ page }) => {
    await waitForBatchesPage(page);

    const refresh = page.locator('button[title="Refresh"]');

    await Promise.all([
      page.waitForLoadState("networkidle"),
      refresh.click(),
    ]);

    await expect(refresh).toBeVisible();
  });

  test("open create batch dialog", async ({ page }) => {
  await waitForBatchesPage(page);

  await page.getByRole("button", {
    name: /Add Batch/i,
  }).click();

  await expect(
    page.getByRole("button", {
      name: /Save Batch/i,
    })
  ).toBeVisible();

  await expect(
    page.getByPlaceholder(/JEE 2025 Batch A/i)
  ).toBeVisible();
});

  test("cancel create batch dialog", async ({ page }) => {
    await waitForBatchesPage(page);

    await page.getByRole("button", {
      name: /Add Batch/i,
    }).click();

    await page.getByRole("button", {
      name: /^Cancel$/,
    }).click();

    await expect(
      page.getByRole("button", {
        name: /Add Batch/i,
      })
    ).toBeVisible();
  });

  test("status filters are visible", async ({ page }) => {
    await waitForBatchesPage(page);

    await expect(page.getByRole("button", { name: /ALL/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ACTIVE/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /UPCOMING/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /COMPLETED/i })).toBeVisible();
  });

test("create batch", async ({ page }) => {
  await waitForBatchesPage(page);

  const batchName = `PW Batch ${Date.now()}`;

  await page.getByRole("button", {
    name: /Add Batch/i,
  }).click();

  await page
    .getByPlaceholder(/JEE 2025 Batch A/i)
    .fill(batchName);

  await page
    .getByPlaceholder(/2025-26/i)
    .fill("2026-27");

  await page
    .getByPlaceholder(/JEE-A/i)
    .fill(`PW-${Date.now()}`);

  await page
    .getByPlaceholder(/JEE, NEET/i)
    .fill("JEE");

  await page
    .locator('input[type="number"]')
    .fill("40");

  await page
    .getByRole("button", {
      name: /Save Batch/i,
    })
    .click();

  await expect(
    page.getByText(/Batch created/i)
  ).toBeVisible();

  await expect(
    page.getByText(batchName)
  ).toBeVisible();
});

test("batch validation", async ({ page }) => {
  await waitForBatchesPage(page);

  await page.getByRole("button", {
    name: /Add Batch/i,
  }).click();

  await page.getByRole("button", {
    name: /Save Batch/i,
  }).click();

  await expect(
    page.getByPlaceholder(/JEE 2025 Batch A/i)
  ).toBeFocused();
});

test("switch status filters", async ({ page }) => {
  await waitForBatchesPage(page);

  await page.getByRole("button", {
    name: /^ACTIVE/,
  }).click();

  await page.getByRole("button", {
    name: /^ALL/,
  }).click();

  await page.getByRole("button", {
    name: /^COMPLETED/,
  }).click();

  await page.getByRole("button", {
    name: /^UPCOMING/,
  }).click();
});

test("open batch details", async ({ page }) => {
  await openFirstBatch(page);

  await expect(
    page.getByRole("button", {
      name: /Students/i,
    })
  ).toBeVisible();
});

test("students tab", async ({ page }) => {
  await openFirstBatch(page);

  await page.getByRole("button", {
    name: /^Students/,
  }).click();

  await expect(
    page.getByRole("button", {
      name: /^Students/,
    })
  ).toBeVisible();
});

test("classes tab", async ({ page }) => {
  await openFirstBatch(page);

  await page.getByRole("button", {
    name: /^Classes/,
  }).click();

  await expect(
    page.getByRole("button", {
      name: /Schedule Class/i,
    })
  ).toBeVisible();
});

test("open schedule class dialog", async ({ page }) => {
  await openFirstBatch(page);

  await page.getByRole("button", {
    name: /^Classes/,
  }).click();

  await page.getByRole("button", {
    name: /Schedule Class/i,
  }).click();

  await expect(
    page.getByRole("button", {
      name: /^Schedule$/,
    })
  ).toBeVisible();
});

test("leads tab", async ({ page }) => {
  await openFirstBatch(page);

  await page.getByRole("button", {
    name: /^Leads/,
  }).click();

  await expect(
    page.getByRole("button", {
      name: /^Leads/,
    })
  ).toBeVisible();
});

test("syllabus tab", async ({ page }) => {
  await openFirstBatch(page);

  await page.getByRole("button", {
    name: /^Syllabus/,
  }).click();

  await Promise.all([
    page.waitForURL(/\/batches\/.*\/syllabus$/),
    page.getByRole("link", {
      name: /Manage Syllabus/i,
    }).click(),
  ]);

  await expect(page).toHaveURL(/\/batches\/.*\/syllabus$/);
});

});