// import { test, expect, type Page } from "@playwright/test";

// const TEST_INSTITUTE = process.env.TEST_INSTITUTE ?? "demo";
// const TEST_EMAIL = process.env.TEST_EMAIL ?? "owner@demo.com";
// const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Admin@1234";

// async function login(page: Page) {
//   await page.goto("/login");

//   await page.locator('input[name="institute"]').fill(TEST_INSTITUTE);
//   await page.locator('input[name="email"]').fill(TEST_EMAIL);
//   await page.locator('input[name="password"]').fill(TEST_PASSWORD);

//   await page.getByRole("button", {
//     name: /sign in/i,
//   }).click();

//   await page.waitForURL(/dashboard/);

//   await expect(page).toHaveURL(/dashboard/);
// }

// async function waitForAttendancePage(page: Page) {
//   await page.goto("/attendance");

//   await expect(
//     page.getByRole("heading", {
//       name: /Mark Attendance/i,
//     })
//   ).toBeVisible();
// }

// test.describe("Attendance", () => {
//   test.beforeEach(async ({ page }) => {
//     await login(page);
//   });

//   test("attendance page loads", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await expect(
//       page.getByRole("button", {
//         name: /Start Session/i,
//       })
//     ).toBeVisible();
//   });

//   test("attendance report button visible", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await expect(
//       page.getByRole("button", {
//         name: /Attendance Report/i,
//       })
//     ).toBeVisible();
//   });

//   test("batch selector visible", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await expect(page.locator("select").first()).toBeVisible();
//   });

//   test("date picker visible", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await expect(page.locator('input[type="date"]')).toHaveCount(1);
//   });

//   test("change attendance date", async ({ page }) => {
//     await waitForAttendancePage(page);

//     const date = page.locator('input[type="date"]');

//     await date.fill("2026-07-01");

//     await expect(date).toHaveValue("2026-07-01");
//   });

//   test("start attendance session", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await page.getByRole("button", {
//   name: /Start Session/i,
// }).click();

// await page.waitForTimeout(2000);

// console.log(await page.locator("body").innerText());
//   });

//   test("class selector visible", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await page.getByRole("button", {
//       name: /Start Session/i,
//     }).click();

//     // Class dropdown appears only when classes exist.
//     const classSelect = page.locator("select").nth(1);

//     if (await classSelect.count()) {
//       await expect(classSelect).toBeVisible();
//     }
//   });

//   test("save attendance button enabled", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await page.getByRole("button", {
//       name: /Start Session/i,
//     }).click();

//     const saveButton = page.getByRole("button", {
//       name: /Save Attendance/i,
//     });

//     if (await saveButton.count()) {
//       await expect(saveButton).toBeEnabled();
//     }
//   });

//   test("attendance grid loads", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await page.getByRole("button", {
//   name: /Start Session/i,
// }).click();

// await page.waitForTimeout(2000);

// console.log(await page.locator("body").innerText());
//   });

//   test("attendance report button enabled", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await expect(
//       page.getByRole("button", {
//         name: /Attendance Report/i,
//       })
//     ).toBeEnabled();
//   });

//   test("batch selector change", async ({ page }) => {
//     await waitForAttendancePage(page);

//     const batchSelect = page.locator("select").first();

//     const options = await batchSelect.locator("option").count();

//     if (options > 1) {
//       const secondValue = await batchSelect
//         .locator("option")
//         .nth(1)
//         .getAttribute("value");

//       if (secondValue) {
//         await batchSelect.selectOption(secondValue);

//         await expect(batchSelect).toHaveValue(secondValue);
//       }
//     } else {
//       await expect(batchSelect).toBeVisible();
//     }
//   });

//  test("multiple start session clicks", async ({ page }) => {
//   await waitForAttendancePage(page);

//   const startButton = page.getByRole("button", {
//     name: /Start Session/i,
//   });

//   await startButton.click();

//   const saveButton = page.getByRole("button", {
//     name: /Save Attendance/i,
//   });

//   if (await saveButton.count()) {
//     await expect(saveButton).toBeVisible();
//   } else {
//     await expect(
//       page.getByText(/No students found for this batch/i)
//     ).toBeVisible();
//   }
// });

//   test("attendance page refresh", async ({ page }) => {
//     await waitForAttendancePage(page);

//     await page.reload();

//     await expect(
//       page.getByRole("heading", {
//         name: /Mark Attendance/i,
//       })
//     ).toBeVisible();
//   });

//   test("attendance page navigation", async ({ page }) => {
//     await page.goto("/dashboard");

//     await page.getByRole("link", {
//       name: /^Attendance$/,
//     }).click();

//     await expect(page).toHaveURL(/attendance/);

//     await expect(
//       page.getByRole("heading", {
//         name: /Mark Attendance/i,
//       })
//     ).toBeVisible();
//   });
// });



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

async function openAttendance(page: Page) {
  await page.goto("/attendance");

  await expect(
    page.getByRole("heading", {
      name: /Mark Attendance/i,
    })
  ).toBeVisible();
}

async function startAttendance(page: Page) {
  await page.getByRole("button", {
    name: /Start Session/i,
  }).click();

  await page.waitForLoadState("networkidle");
}

test.describe("Attendance", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("attendance page loads", async ({ page }) => {
    await openAttendance(page);

    await expect(
      page.getByRole("button", {
        name: /Start Session/i,
      })
    ).toBeVisible();
  });

  test("attendance report button visible", async ({ page }) => {
    await openAttendance(page);

    await expect(
      page.getByRole("button", {
        name: /Attendance Report/i,
      })
    ).toBeVisible();
  });

  test("batch selector visible", async ({ page }) => {
    await openAttendance(page);

    await expect(page.locator("select").first()).toBeVisible();
  });

  test("date picker visible", async ({ page }) => {
    await openAttendance(page);

    await expect(page.locator('input[type="date"]')).toHaveCount(1);
  });

  test("change attendance date", async ({ page }) => {
    await openAttendance(page);

    const date = page.locator('input[type="date"]');

    await date.fill("2026-07-01");

    await expect(date).toHaveValue("2026-07-01");
  });

  test("start attendance session", async ({ page }) => {
    await openAttendance(page);

    await startAttendance(page);

   const noStudents = page.getByText(
  "No students found for this batch."
);

const saveButton = page.getByRole("button", {
  name: /Save Attendance/i,
});

await expect(
  noStudents.or(saveButton)
).toBeVisible();
  });

  test("attendance grid loads", async ({ page }) => {
    await openAttendance(page);

    await startAttendance(page);

    const noStudents = page.getByText(/No students found for this batch/i);

    if (await noStudents.isVisible()) {
      test.skip(true, "Selected batch has no enrolled students.");
    }

    await expect(
      page.getByRole("button", {
        name: /Save Attendance/i,
      })
    ).toBeVisible();
  });

  test("class selector visible", async ({ page }) => {
    await openAttendance(page);

    await startAttendance(page);

    const noStudents = page.getByText(/No students found for this batch/i);

    if (await noStudents.isVisible()) {
      test.skip(true, "No enrolled students.");
    }

    const selects = page.locator("select");

    if ((await selects.count()) > 1) {
      await expect(selects.nth(1)).toBeVisible();
    }
  });

  test("save attendance button enabled", async ({ page }) => {
    await openAttendance(page);

    await startAttendance(page);

    const noStudents = page.getByText(/No students found for this batch/i);

    if (await noStudents.isVisible()) {
      test.skip(true, "No enrolled students.");
    }

    await expect(
      page.getByRole("button", {
        name: /Save Attendance/i,
      })
    ).toBeEnabled();
  });

  test("attendance report button enabled", async ({ page }) => {
    await openAttendance(page);

    await expect(
      page.getByRole("button", {
        name: /Attendance Report/i,
      })
    ).toBeEnabled();
  });

  test("batch selector change", async ({ page }) => {
    await openAttendance(page);

    const batch = page.locator("select").first();

    const optionCount = await batch.locator("option").count();

    if (optionCount > 1) {
      const value = await batch
        .locator("option")
        .nth(1)
        .getAttribute("value");

      if (value) {
        await batch.selectOption(value);

        await expect(batch).toHaveValue(value);
      }
    } else {
      await expect(batch).toBeVisible();
    }
  });

  test("multiple start session clicks", async ({ page }) => {
    await openAttendance(page);

    await startAttendance(page);

    if (
      !(await page
        .getByText(/No students found/i)
        .isVisible()
        .catch(() => false))
    ) {
      await expect(
        page.getByRole("button", {
          name: /Save Attendance/i,
        })
      ).toBeVisible();
    }

    // Clicking again should not crash the page.
    await page.getByRole("button", {
      name: /Start Session/i,
    }).click();
  });

  test("attendance page refresh", async ({ page }) => {
    await openAttendance(page);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: /Mark Attendance/i,
      })
    ).toBeVisible();
  });

  test("attendance page navigation", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", {
      name: /^Attendance$/,
    }).click();

    await expect(page).toHaveURL(/attendance/);

    await expect(
      page.getByRole("heading", {
        name: /Mark Attendance/i,
      })
    ).toBeVisible();
  });
});