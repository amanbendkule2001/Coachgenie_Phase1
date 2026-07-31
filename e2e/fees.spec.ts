// import { test, expect, Page } from "@playwright/test";

// const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
// const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
// const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

// async function login(page: Page) {
//   await page.goto("/login");

//   await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
//   await page.locator('input[name="email"]').fill(TEST_EMAIL);
//   await page.locator('input[name="password"]').fill(TEST_PASSWORD);

//   await page.getByRole("button", { name: /sign in|login/i }).click();

//   await page.waitForURL(/dashboard/, {
//     timeout: 30000,
//   });
// }

// async function openFees(page: Page) {
//   await login(page);

//   await page.goto("/fees");

//   await expect(
//     page.getByRole("heading", {
//       name: /Fee Management/i,
//     })
//   ).toBeVisible();
// }

// test.describe("Fees", () => {
//   test.beforeEach(async ({ page }) => {
//     await openFees(page);
//   });

//   test("page loads", async ({ page }) => {
//     await expect(
//       page.getByRole("heading", {
//         name: /Fee Management/i,
//       })
//     ).toBeVisible();
//   });

//   test("kpi cards visible", async ({ page }) => {
//     await expect(page.getByText(/Total Collected/i)).toBeVisible();
//     await expect(page.getByText(/Outstanding/i)).toBeVisible();
//     await expect(page.getByText(/Overdue/i)).toBeVisible();
//     await expect(page.getByText(/Total Invoices/i)).toBeVisible();
//   });

//   test("search input visible", async ({ page }) => {
//     await expect(
//       page.getByPlaceholder(/Search student/i)
//     ).toBeVisible();
//   });

//   test("month filter visible", async ({ page }) => {
//     await expect(
//       page.getByRole("combobox")
//     ).toBeVisible();
//   });

//   test("status filter buttons visible", async ({ page }) => {
//     await expect(page.getByRole("button", { name: /All/i })).toBeVisible();
//     await expect(page.getByRole("button", { name: /Paid/i })).toBeVisible();
//     await expect(page.getByRole("button", { name: /Pending/i })).toBeVisible();
//     await expect(page.getByRole("button", { name: /Partial/i })).toBeVisible();
//     await expect(page.getByRole("button", { name: /Overdue/i })).toBeVisible();
//   });

//   test("refresh button works", async ({ page }) => {
//     const refresh = page.getByRole("button").first();

//     await refresh.click();

//     await expect(
//       page.getByRole("heading", {
//         name: /Fee Management/i,
//       })
//     ).toBeVisible();
//   });

//   test("search accepts text", async ({ page }) => {
//     const input = page.getByPlaceholder(/Search student/i);

//     await input.fill("Rahul");

//     await expect(input).toHaveValue("Rahul");
//   });

//   test("month filter changes", async ({ page }) => {
//     const select = page.getByRole("combobox");

//     const options = await select.locator("option").count();

//     if (options > 1) {
//       const value = await select.locator("option").nth(1).getAttribute("value");

//       if (value) {
//         await select.selectOption(value);

//         await expect(select).toHaveValue(value);
//       }
//     }
//   });

//   test("status filters clickable", async ({ page }) => {
//     for (const label of ["Paid", "Pending", "Partial", "Overdue"]) {
//       await page.getByRole("button", {
//         name: new RegExp(label, "i"),
//       }).click();
//     }
//   });

//   test("table headers visible", async ({ page }) => {
//     if (await page.getByRole("table").count()) {
//       await expect(page.getByText("Invoice #")).toBeVisible();
//       await expect(page.getByText("Student")).toBeVisible();
//       await expect(page.getByText("Amount")).toBeVisible();
//       await expect(page.getByText("Status")).toBeVisible();
//       await expect(page.getByText("Due Date")).toBeVisible();
//     }
//   });

//   test("sorting works", async ({ page }) => {
//     if (await page.getByText("Invoice #").count()) {
//       await page.getByText("Invoice #").click();
//       await page.getByText("Invoice #").click();
//     }
//   });

//   test("pagination visible if needed", async ({ page }) => {
//     const pageInfo = page.getByText(/page .* of/i);

//     if (await pageInfo.count()) {
//       await expect(pageInfo).toBeVisible();
//     }
//   });

//   test("view invoice if available", async ({ page }) => {
//     const eye = page.locator('a[href^="/fees/"]');

//     if ((await eye.count()) > 0) {
//       await eye.first().click();

//       await expect(page).toHaveURL(/\/fees\/.+/);
//     }
//   });

//   test("refresh page", async ({ page }) => {
//     await page.reload();

//     await expect(
//       page.getByRole("heading", {
//         name: /Fee Management/i,
//       })
//     ).toBeVisible();
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

async function openFees(page: Page) {
  await login(page);

  await page.goto("/fees");

  await expect(
    page.getByRole("heading", {
      name: /Fee Management/i,
    })
  ).toBeVisible();
}

test.describe("Fees", () => {
  test.beforeEach(async ({ page }) => {
    await openFees(page);
  });

  test("page loads", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /Fee Management/i,
      })
    ).toBeVisible();
  });

  test("kpi cards visible", async ({ page }) => {
    const cards = page.locator(".grid").first();

    await expect(cards.getByText("Total Collected")).toBeVisible();
    await expect(cards.getByText("Outstanding")).toBeVisible();
    await expect(cards.getByText("Overdue")).toBeVisible();
    await expect(cards.getByText("Total Invoices")).toBeVisible();
  });

  test("search input visible", async ({ page }) => {
    await expect(
      page.locator(
        'input[placeholder="Search student, invoice…"]'
      )
    ).toBeVisible();
  });

  test("month filter visible", async ({ page }) => {
    await expect(
      page.getByRole("combobox")
    ).toBeVisible();
  });

  test("status filter buttons visible", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: /All/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Paid/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Pending/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Partial/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Overdue/i,
      })
    ).toBeVisible();
  });

  test("refresh button works", async ({ page }) => {
    const refresh = page.getByRole("button", {
      name: "",
    }).first();

    await refresh.click();

    await expect(
      page.getByRole("heading", {
        name: /Fee Management/i,
      })
    ).toBeVisible();
  });

  test("search accepts text", async ({ page }) => {
    const input = page.locator(
      'input[placeholder="Search student, invoice…"]'
    );

    await input.fill("Rahul");

    await expect(input).toHaveValue("Rahul");
  });

  test("month filter changes", async ({ page }) => {
    const select = page.getByRole("combobox");

    const options = await select.locator("option").count();

    if (options > 1) {
      const value = await select
        .locator("option")
        .nth(1)
        .getAttribute("value");

      if (value) {
        await select.selectOption(value);

        await expect(select).toHaveValue(value);
      }
    }
  });

  test("status filters clickable", async ({ page }) => {
    const filters = [
      "Paid",
      "Pending",
      "Partial",
      "Overdue",
    ];

    for (const filter of filters) {
      await page.getByRole("button", {
        name: new RegExp(filter, "i"),
      }).click();
    }
  });

  test("table headers visible", async ({ page }) => {
    if ((await page.getByRole("table").count()) === 0) return;

    const table = page.getByRole("table");

    await expect(table).toBeVisible();

    await expect(
      table.getByRole("button", {
        name: "Invoice #",
      })
    ).toBeVisible();

    await expect(
      table.getByRole("button", {
        name: "Student",
      })
    ).toBeVisible();

    await expect(
      table.getByRole("button", {
        name: "Amount",
      })
    ).toBeVisible();

    await expect(
      table.getByRole("button", {
        name: "Status",
      })
    ).toBeVisible();

    await expect(
      table.getByRole("button", {
        name: "Due Date",
      })
    ).toBeVisible();
  });

  test("sorting works", async ({ page }) => {
    if ((await page.getByRole("table").count()) === 0) return;

    await page
      .getByRole("button", {
        name: "Invoice #",
      })
      .click();

    await page
      .getByRole("button", {
        name: "Invoice #",
      })
      .click();
  });

  test("pagination visible if needed", async ({ page }) => {
    const info = page.getByText(/page .* of/i);

    if ((await info.count()) > 0) {
      await expect(info).toBeVisible();
    }
  });

  test("view invoice if available", async ({ page }) => {
    const links = page.locator('a[href^="/fees/"]');

    if ((await links.count()) === 0) return;

    await links.first().click();

    await expect(page).toHaveURL(/\/fees\/.+/);
  });

  test("page refresh", async ({ page }) => {
    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /Fee Management/i,
      })
    ).toBeVisible();
  });
});