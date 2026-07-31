import { test, expect, type Page } from "@playwright/test";

/**
 * Matches backend/seed.py — run against TEST_DATABASE_URL before tests
 * (see e2e/README.md). Uses the "owner" role since it has full permissions.
 */
const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.fill('input[name="institute"]', TEST_INSTITUTE);
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);

  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 10_000 }),
    page.click('button:has-text("Sign in")'),
  ]);

  await expect(async () => {
    const cookies = await page.context().cookies();
    console.log(cookies);
    const names = cookies.map((c) => c.name);
    expect(names).toContain("cg_access_token");
    expect(names).toContain("cg_refresh_token");
  }).toPass({ timeout: 10_000 });
}

/**
 * Fills and submits the Add Lead form.
 *
 * Hardened against the modal silently disappearing (unmount/re-render/
 * navigation) right after becoming visible:
 *  - no manual evaluate()-based scroll (that had no bounded timeout and
 *    would hang for the full test budget if the element vanished)
 *  - explicit "still attached" assertion right before the click, so a
 *    disappearing modal fails FAST with a clear message instead of
 *    silently eating the whole test timeout
 *  - dialog-open assertion up front, so a modal that never opens is
 *    reported as "modal did not open", not conflated with form-fill issues
 */
async function createLead(page: Page, name: string) {
  await page.click('button:has-text("Add Lead")');

  const dialog = page.locator('[role="dialog"]');
  await expect(
    dialog,
    "Add Lead dialog did not open after clicking the button"
  ).toBeVisible({ timeout: 10_000 });

  // await page.fill(`input[placeholder="Student's full name"]`, name);
  // await page.fill('input[placeholder="+91 98765 43210"] >> nth=0', "9876543210");
  // await page.fill(
  //   'input[placeholder="e.g. JEE Mains, NEET, Foundation"]',
  //   "JEE Mains"
  // );
  await page.fill(`input[placeholder="Student's full name"]`, name);

await page.fill(
  'input[placeholder="student@example.com"]',
  `playwright.${Date.now()}@test.com`
);

await page.fill(
  'input[placeholder="+91 98765 43210"] >> nth=0',
  "9876543210"
);

await page.fill(
  'input[placeholder="e.g. JEE Mains, NEET, Foundation"]',
  "JEE Mains"
);

  const submitButton = page.locator('[data-testid="lead-form-submit"]');
  await expect(
    submitButton,
    "Submit button never became visible after filling the form"
  ).toBeVisible({ timeout: 10_000 });

  // Playwright's built-in scroll: bounded, retries safely, no hang risk.
  await submitButton.scrollIntoViewIfNeeded();

  // Re-check right before clicking. If the modal vanished between the
  // visibility check above and now, fail here with a clear message
  // instead of hanging in click()/evaluate() for the rest of the budget.
  await expect(
    submitButton,
    "Submit button disappeared just before click — the Add Lead modal likely closed/unmounted unexpectedly"
  ).toBeVisible({ timeout: 3_000 });
  await expect(
    dialog,
    "Add Lead dialog closed unexpectedly before submit"
  ).toBeVisible({ timeout: 1_000 });

  // const [createRes] = await Promise.all([
  //   page.waitForResponse(
  //     (res) => res.url().includes("/leads") && res.request().method() === "POST",
  //     { timeout: 10_000 }
  //   ),
  //   submitButton.click({ timeout: 5_000 }),
  // ]);

  // const json = await createRes.json();
  // const lead = json.data ?? json;
  // return lead.id as string;
  const [createRes] = await Promise.all([
  page.waitForResponse(
    (res) =>
      res.url().includes("/leads") &&
      res.request().method() === "POST",
    { timeout: 10_000 }
  ),
  submitButton.click({ timeout: 5_000 }),
]);

const status = createRes.status();
const body = await createRes.text();

console.log("=================================");
console.log("POST /leads STATUS:", status);
console.log("POST /leads BODY:");
console.log(body);
console.log("=================================");

expect(status).toBe(201);

const json = JSON.parse(body);
const lead = json.data ?? json;
return lead.id as string;
}

test.describe("Leads", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Surface page-level failures immediately as attachments instead of
    // letting them manifest only as a mystery timeout downstream.
    page.on("pageerror", (err) => {
      testInfo.attach("pageerror", { body: String(err.stack ?? err) });
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        testInfo.attach("console-error", { body: msg.text() });
      }
    });
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        testInfo.attach("navigation", { body: frame.url() });
      }
    });

    await login(page);
  });

  test("create a lead and see it in the table", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const beforeCountText = await page.locator("p.text-sm.text-muted-foreground").first().innerText();
    const beforeCount = parseInt(beforeCountText.match(/(\d+) total/)?.[1] ?? "0", 10);

    const uniqueName = `Playwright Test Lead ${Date.now()}`;
    await createLead(page, uniqueName);

    await expect(page.locator("text=Lead created successfully!")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();

    await expect(async () => {
      const afterCountText = await page
        .locator("p.text-sm.text-muted-foreground")
        .first()
        .innerText();
      const afterCount = parseInt(afterCountText.match(/(\d+) total/)?.[1] ?? "0", 10);
      expect(afterCount).toBe(beforeCount + 1);
    }).toPass({ timeout: 10_000 });
  });

  test("delete a lead removes it from the table", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const uniqueName = `Playwright Delete Me ${Date.now()}`;
    const leadId = await createLead(page, uniqueName);

    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();

    const row = page.locator("tr", { hasText: uniqueName });
    await row.locator(`[data-testid="lead-delete-${leadId}"]`).click();

    await expect(page.locator("text=Lead deleted")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${uniqueName}`)).toHaveCount(0);
  });

  test("expired access token during lead creation refreshes silently and succeeds", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    let leadsPostCount = 0;
    await page.route("**/api/proxy/leads", async (route) => {
      if (route.request().method() === "POST") {
        leadsPostCount++;
        if (leadsPostCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ error: "Token expired" }),
          });
          return;
        }
      }
      await route.continue();
    });

    const uniqueName = `Playwright Refresh Test ${Date.now()}`;
    await page.click('button:has-text("Add Lead")');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // await page.fill('input[placeholder="Student\'s full name"]', uniqueName);
    // await page.fill('input[placeholder="+91 98765 43210"] >> nth=0', "9876543210");
    // await page.fill('input[placeholder="e.g. JEE Mains, NEET, Foundation"]', "JEE Mains");
    await page.fill(
  'input[placeholder="Student\'s full name"]',
  uniqueName
);

await page.fill(
  'input[placeholder="student@example.com"]',
  `refresh.${Date.now()}@test.com`
);

await page.fill(
  'input[placeholder="+91 98765 43210"] >> nth=0',
  "9876543210"
);

await page.fill(
  'input[placeholder="e.g. JEE Mains, NEET, Foundation"]',
  "JEE Mains"
);

    const submitButton = page.locator('[data-testid="lead-form-submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeVisible({ timeout: 3_000 });

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/auth/refresh") && res.request().method() === "POST",
        { timeout: 10_000 }
      ),
      submitButton.click({ timeout: 5_000 }),
    ]);

    await expect(page.locator("text=Lead created successfully!")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/leads/); // confirms no bounce to /login or /dashboard
    expect(leadsPostCount).toBeGreaterThanOrEqual(2);
  });

  test("failed refresh redirects cleanly to /login with session_expired reason", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    await page.route("**/api/proxy/leads", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Token expired" }),
      });
    });

    // await page.route("**/api/auth/refresh", async (route) => {
    //   await route.fulfill({
    //     status: 401,
    //     contentType: "application/json",
    //     body: JSON.stringify({ error: "Refresh failed" }),
    //   });
    // });
//     await page.route("**/api/v1/auth/refresh", async (route) => {
//   console.log(">>> Mock Backend Refresh");

//   await route.fulfill({
//     status: 401,
//     contentType: "application/json",
//     body: JSON.stringify({
//       detail: "Refresh token expired",
//     }),
//   });
// });
await page.route("**/api/auth/refresh", async (route) => {
  const headers = {
    ...route.request().headers(),
    "x-playwright-fail-refresh": "1",
  };

  await route.continue({ headers });
});

    const uniqueName = `Playwright Redirect Test ${Date.now()}`;
    await page.click('button:has-text("Add Lead")');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // await page.fill('input[placeholder="Student\'s full name"]', uniqueName);
    // await page.fill('input[placeholder="+91 98765 43210"] >> nth=0', "9876543210");
    // await page.fill('input[placeholder="e.g. JEE Mains, NEET, Foundation"]', "JEE Mains");
    await page.fill(
  'input[placeholder="Student\'s full name"]',
  uniqueName
);

await page.fill(
  'input[placeholder="student@example.com"]',
  `redirect.${Date.now()}@test.com`
);

await page.fill(
  'input[placeholder="+91 98765 43210"] >> nth=0',
  "9876543210"
);

await page.fill(
  'input[placeholder="e.g. JEE Mains, NEET, Foundation"]',
  "JEE Mains"
);


    const submitButton = page.locator('[data-testid="lead-form-submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeVisible({ timeout: 3_000 });
    // await submitButton.click({ timeout: 5_000 });

    // await page.waitForURL(/\/login/, { timeout: 10_000 });
    await Promise.all([
    page.waitForResponse(
        (res) =>
            res.url().includes("/api/auth/refresh") &&
            res.request().method() === "POST"
    ),
    submitButton.click({ timeout: 5000 }),
]);

await page.waitForURL(/\/login/, {
    timeout: 10000,
});
await expect(async () => {
    expect(page.url()).toContain("/login");
}).toPass({
    timeout: 10000,
});
    await expect(page).toHaveURL(/reason=session_expired/);
  });
});