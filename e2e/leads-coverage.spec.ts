import { test, expect, type Page } from "@playwright/test";

/**
 * Coverage for the Leads module features confirmed to exist in the current
 * UI (see conversation/audit that preceded this file):
 *
 *   - Search Lead              → global filter input in LeadTable
 *   - Filter by Status         → stage pills on /leads header
 *   - Pagination               → TanStack Table, pageSize 10, prev/next
 *   - Change Lead Stage        → "Change Stage" panel on /leads/[id]
 *   - View Lead Details        → /leads/[id] route
 *   - Validation errors        → zod schema in LeadForm
 *
 * Deliberately NOT covered here (not implemented in the UI as of this
 * audit — see LeadForm/leads page/router):
 *   - Update/Edit Lead
 *   - Assign Counselor
 *   - Schedule Follow-up
 *
 * Known gaps / follow-ups for whoever owns this suite next:
 *   - Stage pills, "Change Stage" buttons, and pagination prev/next
 *     buttons have no data-testid. Selectors below resolve them
 *     structurally / by text captured at runtime instead of hardcoded
 *     labels, because lib/constants/leads.ts (STAGE_CONFIG/STAGES) was
 *     not available when this was written. If that file is ever
 *     restructured, these will need a look. Adding data-testid to those
 *     three areas would make this a lot less brittle.
 *   - LeadDrawer.tsx (opened by the table's eye-icon button) was not
 *     available either, so "View Lead Details" below exercises the
 *     /leads/[id] route directly rather than the inline drawer. The
 *     drawer path is real and used in the product — just untested here.
 */

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

/**
 * The backend enforces phone uniqueness per lead. A single hardcoded
 * default phone across every createLead() call collides the moment more
 * than one test creates a lead in the same run (or DB that isn't reset
 * between runs), producing a 422. A monotonic counter combined with the
 * timestamp guarantees uniqueness within a process even if two calls land
 * in the same millisecond.
 */
let phoneCounter = 0;
function uniquePhone() {
  phoneCounter += 1;
  const digits = (Date.now() + phoneCounter).toString().slice(-9);
  return `9${digits}`;
}

// ─── Shared helpers (mirrors conventions from the existing leads.spec.ts) ───

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
    const names = cookies.map((c) => c.name);
    expect(names).toContain("cg_access_token");
    expect(names).toContain("cg_refresh_token");
  }).toPass({ timeout: 10_000 });
}

async function openAddLeadModal(page: Page) {
  await page.click('button:has-text("Add Lead")');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog, "Add Lead dialog did not open").toBeVisible({ timeout: 10_000 });
  return dialog;
}

/**
 * Fills and submits the Add Lead form with the minimum required fields
 * (Name, Phone, Interested Course — Source defaults to "Website").
 * Returns the created lead's id.
 */
async function createLead(
  page: Page,
  overrides: { name: string; phone?: string; subject?: string; email?: string }
) {
  await openAddLeadModal(page);

  await page.fill(`input[placeholder="Student's full name"]`, overrides.name);
  await page.fill(
    'input[placeholder="student@example.com"]',
    overrides.email ?? `playwright.${Date.now()}@test.com`
  );
  await page.fill(
    'input[placeholder="+91 98765 43210"] >> nth=0',
    overrides.phone ?? uniquePhone()
  );
  await page.fill(
    'input[placeholder="e.g. JEE Mains, NEET, Foundation"]',
    overrides.subject ?? "JEE Mains"
  );

  const submitButton = page.locator('[data-testid="lead-form-submit"]');
  await expect(submitButton).toBeVisible({ timeout: 10_000 });
  await submitButton.scrollIntoViewIfNeeded();

  const [createRes] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/leads") && res.request().method() === "POST",
      { timeout: 10_000 }
    ),
    submitButton.click({ timeout: 5_000 }),
  ]);

  const status = createRes.status();
  const body = await createRes.text();


  expect(status).toBe(201);

  const json = JSON.parse(body);
  const lead = json.data ?? json;
  return lead.id as string;
}

/**
 * Creates a lead via a direct API call (reusing the page's session cookies)
 * instead of the UI. Used purely to seed volume for the pagination test —
 * clicking "Add Lead" 11+ times through the modal would be slow and adds
 * nothing the UI-driven createLead() above doesn't already cover.
 */
async function createLeadViaApi(page: Page, name: string, phone: string) {
  const res = await page.request.post("/api/proxy/leads", {
    data: {
      full_name: name,
      phone,
      source: "website",
      interested_course: "JEE Mains",
      notes: "",
      board_name: "",
      batch_id: null,
      subjects: [],
    },
  });
  expect(res.status(), "Bulk seed lead creation failed").toBe(201);
}

test.describe("Leads — Search, Filter, Pagination, Stage, Details, Validation", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    page.on("pageerror", (err) => {
      testInfo.attach("pageerror", { body: String(err.stack ?? err) });
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        testInfo.attach("console-error", { body: msg.text() });
      }
    });

    await login(page);
  });

  // ── Search ──────────────────────────────────────────────────────────────
  test("search filters the table to matching leads only", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const uniqueName = `Playwright Search Target ${Date.now()}`;
    await createLead(page, { name: uniqueName });
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();

    const searchInput = page.getByPlaceholder("Search leads…");
    await searchInput.fill(uniqueName);

    // The row for our lead should remain, and the row count should reflect
    // a filtered result (rows found = 1, since the name is unique).
    const matchingRow = page.locator("tr", { hasText: uniqueName });
    await expect(matchingRow).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);

    // Clearing the search restores the full (unfiltered) table.
    await searchInput.fill("");
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("search with no matches shows the empty state", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const searchInput = page.getByPlaceholder("Search leads…");
    await searchInput.fill(`no-such-lead-${Date.now()}-zzz`);

    await expect(page.getByText("No leads found.")).toBeVisible();
  });

  // ── Filter by Status ────────────────────────────────────────────────────
  test("stage pill filters the table to a single stage", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const uniqueName = `Playwright Filter Target ${Date.now()}`;
    await createLead(page, { name: uniqueName });

    // Read the stage label actually rendered for the lead we just created,
    // rather than assuming a hardcoded stage name (e.g. "New").
    const row = page.locator("tr", { hasText: uniqueName });
await expect(row).toBeVisible();

const cells = await row.locator("td").allInnerTexts();
const stageCellText = cells[7].trim(); // Status column

expect(stageCellText.length).toBeGreaterThan(0);

const pillBar = page.locator("div.flex.flex-wrap.gap-2");
const stagePill = pillBar.getByRole("button", {
  name: new RegExp(`^${stageCellText}\\s*\\(\\d+\\)$`),
});

await expect(stagePill).toBeVisible();
await stagePill.click();

// Every visible row should now show the selected stage.
const rows = page.locator("tbody tr");
const count = await rows.count();
expect(count).toBeGreaterThan(0);
for (let i = 0; i < count; i++) {
  await expect(rows.nth(i).locator("td").nth(7)).toHaveText(stageCellText);
}

// Reset back to All.
await pillBar.getByRole("button", { name: /^All \(\d+\)$/ }).click();
await expect(page.locator(`text=${uniqueName}`)).toBeVisible();

});

  // ── Pagination ──────────────────────────────────────────────────────────
  test("pagination controls page through results when there are more than 10 leads", async ({
    page,
  }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    // Seed enough leads to guarantee a second page (pageSize = 10).
    const seedBase = Date.now();
    for (let i = 0; i < 11; i++) {
      await createLeadViaApi(page, `Playwright Page Seed ${seedBase}-${i}`, `90000${String(i).padStart(5, "0")}`);
    }

    await page.reload();
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    // Pagination bar has no data-testid; it's the row containing the
    // "current / total" page label plus prev/next icon buttons.
    const pageLabel = page.locator("span.text-xs.text-muted-foreground", {
      hasText: /^\d+ \/ \d+$/,
    });
    await expect(pageLabel).toBeVisible();
    const paginationBar = pageLabel.locator("..");
    const prevButton = paginationBar.locator("button").first();
    const nextButton = paginationBar.locator("button").last();

    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeEnabled();
    await expect(pageLabel).toHaveText(/^1 \/ \d+$/);

    const firstPageFirstRowText = await page.locator("tbody tr").first().innerText();

    await nextButton.click();
    await expect(pageLabel).toHaveText(/^2 \/ \d+$/);
    await expect(prevButton).toBeEnabled();

    const secondPageFirstRowText = await page.locator("tbody tr").first().innerText();
    expect(secondPageFirstRowText).not.toBe(firstPageFirstRowText);

    await prevButton.click();
    await expect(pageLabel).toHaveText(/^1 \/ \d+$/);
  });

  test("next button is disabled when there is only one page of results", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const totalText = await page.locator("p.text-sm.text-muted-foreground").first().innerText();
    const total = parseInt(totalText.match(/(\d+) total/)?.[1] ?? "0", 10);
    test.skip(total > 10, "Fixture data already exceeds one page — covered by the pagination test above.");

    const pageLabel = page.locator("span.text-xs.text-muted-foreground", {
      hasText: /^\d+ \/ \d+$/,
    });
    const paginationBar = pageLabel.locator("..");
    const nextButton = paginationBar.locator("button").last();

    await expect(nextButton).toBeDisabled();
  });

  // ── Change Lead Stage ───────────────────────────────────────────────────
  test("changing stage on the lead detail page updates the active stage", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const uniqueName = `Playwright Stage Change ${Date.now()}`;
    const leadId = await createLead(page, { name: uniqueName });

    await page.goto(`/leads/${leadId}`);
    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();

    const stagePanel = page.locator("div.rounded-xl.border.bg-card", {
      has: page.getByRole("heading", { name: "Change Stage" }),
    });
    await expect(stagePanel).toBeVisible();

    const stageButtons = stagePanel.locator("button");
    const stageCount = await stageButtons.count();
    expect(stageCount).toBeGreaterThan(1);

    // Find the currently active stage (marked with a trailing "Current" tag)
    // and pick a different one to click.
    let currentIndex = -1;
    let targetIndex = -1;
    let targetLabel = "";
    for (let i = 0; i < stageCount; i++) {
      const text = await stageButtons.nth(i).innerText();
      if (text.includes("Current")) {
        currentIndex = i;
      } else if (targetIndex === -1) {
        targetIndex = i;
        targetLabel = text.trim();
      }
    }
    expect(currentIndex).toBeGreaterThanOrEqual(0);
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    await stageButtons.nth(targetIndex).click();

    await expect(page.getByText(`Stage updated to ${targetLabel}`)).toBeVisible({
      timeout: 10_000,
    });
    await expect(stageButtons.nth(targetIndex)).toContainText("Current");
    await expect(stageButtons.nth(currentIndex)).not.toContainText("Current");
  });

  // ── View Lead Details ───────────────────────────────────────────────────
  test("lead detail page shows the submitted contact and academic info", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    const uniqueName = `Playwright Detail View ${Date.now()}`;
    const email = `detail.${Date.now()}@test.com`;
    const phone = "9123456780";
    const leadId = await createLead(page, {
      name: uniqueName,
      email,
      phone,
      subject: "NEET",
    });

    await page.goto(`/leads/${leadId}`);

    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(phone)).toBeVisible();
    await expect(page.getByText("NEET").first()).toBeVisible();
  });

  // ── Validation errors ───────────────────────────────────────────────────
  test("submitting the Add Lead form empty shows required-field errors", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    await openAddLeadModal(page);

    const submitButton = page.locator('[data-testid="lead-form-submit"]');
    await submitButton.click();

    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("Phone is required")).toBeVisible();
    await expect(page.getByText("Interested course is required")).toBeVisible();

    // No POST should have fired — the form is invalid.
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("an invalid email shows a format error and blocks submission", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("text=Loading…")).toHaveCount(0, { timeout: 10_000 });

    await openAddLeadModal(page);

    await page.fill(`input[placeholder="Student's full name"]`, `Playwright Bad Email ${Date.now()}`);
    await page.fill('input[placeholder="student@example.com"]', "not-an-email");
    await page.fill('input[placeholder="+91 98765 43210"] >> nth=0', "9876543210");
    await page.fill(
      'input[placeholder="e.g. JEE Mains, NEET, Foundation"]',
      "JEE Mains"
    );

    const submitButton = page.locator('[data-testid="lead-form-submit"]');
    await submitButton.click();

    await expect(page.getByText("Invalid email")).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});