// import { test, expect, Page } from "@playwright/test";

// const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
// const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
// const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

// async function login(page: Page) {
//   await page.goto("/login");

//   await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
//   await page.locator('input[name="email"]').fill(TEST_EMAIL);
//   await page.locator('input[name="password"]').fill(TEST_PASSWORD);

//   await page.getByRole("button", {
//     name: /sign in|login/i,
//   }).click();

//   await page.waitForURL(/dashboard/);
// }

// async function openFirstLead(page: Page) {
//   await page.goto("/leads");

//   await page.waitForLoadState("networkidle");

//   const firstView = page.locator('[data-testid^="lead-view-"]').first();

//   await expect(firstView).toBeVisible();

//   await firstView.click();

//   await page.pause();
// }

// test.describe("Lead Details", () => {
//   test.beforeEach(async ({ page }) => {
//     await login(page);
//     await openFirstLead(page);
//   });

//   test("page loads", async ({ page }) => {
//     await expect(
//       page.locator("h1")
//     ).toBeVisible();
//   });

// test("contact section visible", async ({ page }) => {
//   await expect(
//     page.getByText("Contact", { exact: true })
//   ).toBeVisible();
// });

//   test("academic details visible", async ({ page }) => {
//     await expect(
//       page.getByText("Academic Details")
//     ).toBeVisible();
//   });

// test("log activity section visible", async ({ page }) => {
//   await expect(
//     page.getByText("Log Activity")
//   ).toBeVisible();
// });

// test("stage buttons visible", async ({ page }) => {
//   await expect(
//     page.getByRole("button", { name: "New", exact: true })
//   ).toBeVisible();
// });

// test("recent activity section when available", async ({ page }) => {
//   const section = page.getByText("Recent Activity");

//   if (await section.count()) {
//     await expect(section).toBeVisible();
//   }
// });

// test("notes section when available", async ({ page }) => {
//   const notes = page.getByText("Notes");

//   if (await notes.count()) {
//     await expect(notes).toBeVisible();
//   }
// });

// test("view full profile button visible", async ({ page }) => {
//   await expect(
//     page.getByRole("button", {
//       name: /View Full Profile/i,
//     })
//   ).toBeVisible();
// });
// //   test("back navigation", async ({ page }) => {
// //     await page.locator("button").first().click();

// //     await expect(page).toHaveURL(/\/leads$/);
// //   });

//   test("delete button visible", async ({ page }) => {
//     await expect(
//       page.getByRole("button").filter({
//         has: page.locator("svg"),
//       }).last()
//     ).toBeVisible();
//   });

//   test("convert button visible when applicable", async ({ page }) => {
//     const btn = page.getByRole("button", {
//       name: /Convert to Admission/i,
//     });

//     if (await btn.count()) {
//       await expect(btn).toBeVisible();
//     }
//   });

//   test("log activity form visible", async ({ page }) => {
//     await expect(
//       page.getByText("Log Activity")
//     ).toBeVisible();

//     await expect(
//       page.locator("textarea")
//     ).toBeVisible();
//   });

//   test("activity type buttons visible", async ({ page }) => {
//     await expect(page.getByRole("button", { name: "Note" })).toBeVisible();
//     await expect(page.getByRole("button", { name: "Call" })).toBeVisible();
//     await expect(page.getByRole("button", { name: "Message" })).toBeVisible();
//     await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
//   });

//   test("log button disabled when textarea empty", async ({ page }) => {
//     await expect(
//       page.getByRole("button", { name: /^Log$/ })
//     ).toBeDisabled();
//   });

//   test("activity can be typed", async ({ page }) => {
//     const area = page.locator("textarea");

//     await area.fill("Playwright activity");

//     await expect(area).toHaveValue("Playwright activity");
//   });
// });


import { test, expect, Page } from "@playwright/test";

const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);

  await page.getByRole("button", {
    name: /sign in|login/i,
  }).click();

  await page.waitForURL(/dashboard/, {
    timeout: 30000,
  });
}

async function openFirstLead(page: Page) {
  await login(page);

  await page.goto("/leads");

  await page.waitForLoadState("networkidle");

  const firstView = page.locator('[data-testid^="lead-view-"]').first();

  await expect(firstView).toBeVisible();

  await firstView.click();

  await expect(
    page.getByRole("heading", { level: 2 })
  ).toBeVisible();
}

test.describe("Lead Details", () => {
  test.beforeEach(async ({ page }) => {
    await openFirstLead(page);
  });

  test("drawer opens", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 2 })
    ).toBeVisible();
  });

  test("pipeline stage section visible", async ({ page }) => {
    await expect(
      page.getByText("Pipeline Stage", { exact: true })
    ).toBeVisible();
  });

  test("stage buttons visible", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: "New",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Contacted",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Demo Scheduled",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Demo Done",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Negotiation",
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Enrolled",
        exact: true,
      })
    ).toBeVisible();
  });

  test("contact section visible", async ({ page }) => {
  const drawer = page.locator(".fixed.right-0.top-0");

  await expect(
    drawer.getByText("Contact", { exact: true })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "Email" })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "Phone" })
  ).toBeVisible();

  await expect(
    drawer.getByText("Parent", { exact: true })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "School" })
  ).toBeVisible();
});

 test("academic details visible", async ({ page }) => {
  const drawer = page.locator(".fixed.right-0.top-0");

  await expect(
    drawer.getByText("Academic Details", { exact: true })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "Grade" })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "Board" })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "Source" })
  ).toBeVisible();

  await expect(
    drawer.locator("span", { hasText: "Batch" })
  ).toBeVisible();
});

  test("subjects section when available", async ({ page }) => {
    const subjects = page.getByText("Subjects");

    if (await subjects.count()) {
      await expect(subjects).toBeVisible();
    }
  });

  test("recent activity section when available", async ({ page }) => {
    const recent = page.getByText("Recent Activity");

    if (await recent.count()) {
      await expect(recent).toBeVisible();
    }
  });

  test("notes section when available", async ({ page }) => {
    const notes = page.getByText("Notes");

    if (await notes.count()) {
      await expect(notes).toBeVisible();
    }
  });

  test("view full profile button visible", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: /View Full Profile/i,
      })
    ).toBeVisible();
  });

  test("close drawer", async ({ page }) => {
    await page.locator("button").last().click();

    await expect(
      page.getByRole("heading", {
        name: /Leads/i,
      })
    ).toBeVisible();
  });
});