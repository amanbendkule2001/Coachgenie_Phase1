import { test, expect, type Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/dashboard/);

  await expect(page).toHaveURL(/dashboard/);
}

async function openExams(page: Page) {
  await page.goto("/exams");

  await expect(
    page.getByRole("heading", {
      name: /^Exams$/,
    })
  ).toBeVisible();
}

test.describe("Exams", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("exams page loads", async ({ page }) => {
    await openExams(page);

    await expect(
      page.getByRole("button", {
        name: /Create Exam/i,
      })
    ).toBeVisible();
  });

  test("open create exam dialog", async ({ page }) => {
    await openExams(page);

    await page.getByRole("button", {
      name: /Create Exam/i,
    }).click();

    await expect(
      page.getByRole("heading", {
        name: /Create Exam/i,
      })
    ).toBeVisible();
  });

  test("cancel create exam dialog", async ({ page }) => {
    await openExams(page);

    await page.getByRole("button", {
      name: /Create Exam/i,
    }).click();

    await page.getByRole("button", {
      name: /^Cancel$/,
    }).click();

    await expect(
      page.getByRole("heading", {
        name: /Create Exam/i,
      })
    ).toHaveCount(0);
  });

  test("required field validation", async ({ page }) => {
    await openExams(page);

    await page.getByRole("button", {
      name: /Create Exam/i,
    }).click();

    await page.getByRole("button", {
      name: /^Create Exam$/,
    }).last().click();

    await expect(
      page.getByText(/String must contain/i).first()
    ).toBeVisible();
  });

test("create exam", async ({ page }) => {
  await openExams(page);

  await page.getByRole("button", {
    name: /Create Exam/i,
  }).click();

  await page.locator('input[name="name"]').fill(
    "Playwright Automation Exam"
  );

  await page.locator('input[name="subject"]').fill(
    "Physics"
  );

  const batch = page.locator('select[name="batchId"]');

  const optionCount = await batch.locator("option").count();

  if (optionCount <= 1) {
    test.skip(true, "No batches available");
  }

  await batch.selectOption({ index: 1 });

  await page
    .locator('input[name="date"]')
    .fill("2026-08-20");

  await page
    .locator('input[name="maxMarks"]')
    .fill("100");

  await page
    .locator('input[name="duration"]')
    .fill("180");

  await page
    .locator('select[name="status"]')
    .selectOption("UPCOMING");

  await page.getByRole("button", {
    name: /^Create Exam$/,
  }).last().click();

  await expect(
    page.getByText(/Exam created!/i)
  ).toBeVisible();

  await expect(
    page.getByText("Playwright Automation Exam")
  ).toBeVisible();
});

  test("filter buttons visible", async ({ page }) => {
    await openExams(page);

    await expect(page.getByRole("button", { name: /ALL/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /UPCOMING/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ONGOING/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /COMPLETED/i })).toBeVisible();
  });

  test("change filters", async ({ page }) => {
    await openExams(page);

    await page.getByRole("button", { name: /UPCOMING/i }).click();
    await page.getByRole("button", { name: /ONGOING/i }).click();
    await page.getByRole("button", { name: /COMPLETED/i }).click();
    await page.getByRole("button", { name: /ALL/i }).click();
  });

  test("exam detail page opens", async ({ page }) => {
    await openExams(page);

    const exams = page.locator('a[href^="/exams/"]');

    if ((await exams.count()) === 0) {
      test.skip();
    }

    await exams.first().click();

    await expect(page).toHaveURL(/\/exams\/.+/);
  });

  test("navigation from dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", {
      name: /^Exams$/,
    }).click();

    await expect(page).toHaveURL(/exams/);

    await expect(
      page.getByRole("heading", {
        name: /^Exams$/,
      })
    ).toBeVisible();
  });

  test("page refresh", async ({ page }) => {
    await openExams(page);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /^Exams$/,
      })
    ).toBeVisible();
  });

test("enter results and save", async ({ page }) => {
  await openExams(page);

  const examLink = page.locator('a[href^="/exams/"]').first();

  if ((await examLink.count()) === 0) {
    test.skip(true, "No exams available");
  }

  await examLink.click();

  await expect(page).toHaveURL(/\/exams\/.+/);

  const resultButton = page.getByRole("link", {
    name: /Enter Results|Edit Results/i,
  });

  await expect(resultButton).toBeVisible();

  await resultButton.click();

  await expect(
    page.getByRole("heading", {
      name: /Enter Results/i,
    })
  ).toBeVisible();

  const marks = page.locator('input[type="number"]');

  const count = await marks.count();

  if (count === 0) {
    test.skip(true, "No students in this batch");
  }

  if (count >= 1) await marks.nth(0).fill("95");
  if (count >= 2) await marks.nth(1).fill("88");
  if (count >= 3) await marks.nth(2).fill("72");

  await page.getByRole("button", {
    name: /Save & Rank/i,
  }).click();

  await expect(
    page.getByText(/Results saved and ranked/i)
  ).toBeVisible();

  await expect(page).toHaveURL(/\/exams\/.+$/);
});

test("statistics visible after saving", async ({ page }) => {
  await openExams(page);

  const examLink = page.locator('a[href^="/exams/"]').first();

  if ((await examLink.count()) === 0) {
    test.skip(true);
  }

  await examLink.click();

  await expect(page.getByText("Students")).toBeVisible();
  await expect(page.getByText("Average")).toBeVisible();
  await expect(page.getByText("Highest")).toBeVisible();
});

test("ranking table visible", async ({ page }) => {
  await openExams(page);

  const examLink = page.locator('a[href^="/exams/"]').first();

  if ((await examLink.count()) === 0) {
    test.skip(true);
  }

  await examLink.click();

  if (
    (await page.getByText(/No results entered yet/i).count()) > 0
  ) {
    test.skip(true);
  }

  await expect(
    page.getByRole("heading", {
      name: /Rankings/i,
    })
  ).toBeVisible();

  await expect(page.locator("table")).toBeVisible();
});

test("reset results", async ({ page }) => {
  await openExams(page);

  const examLink = page.locator('a[href^="/exams/"]').first();

  if ((await examLink.count()) === 0) {
    test.skip(true);
  }

  await examLink.click();

  await page.getByRole("link", {
    name: /Edit Results|Enter Results/i,
  }).click();

  const marks = page.locator('input[type="number"]');

  if ((await marks.count()) === 0) {
    test.skip(true);
  }

  await marks.first().fill("50");

  const reset = page.getByRole("button", {
    name: /Reset/i,
  });

  if ((await reset.count()) === 0) {
    test.skip(true);
  }

  await reset.click();

  await expect(reset).toBeHidden();
});


});