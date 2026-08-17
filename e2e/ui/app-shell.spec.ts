// import { test, expect } from "@playwright/test";
// import { loginAsOwner } from "../helpers/auth";

// test.describe("App Shell", () => {
//   test.beforeEach(async ({ page }) => {
//     await loginAsOwner(page);
//     await page.goto("/dashboard");
//     await page.waitForLoadState("networkidle");
//   });

//   test("sidebar renders", async ({ page }) => {
//     await expect(page.getByText("CoachGenie")).toBeVisible();

//     await expect(
//       page.getByRole("link", { name: "Dashboard" })
//     ).toBeVisible();

//     await expect(
//       page.getByRole("link", { name: "Students" })
//     ).toBeVisible();

//     await expect(
//       page.getByRole("link", { name: "Leads" })
//     ).toBeVisible();
//   });

//   test("sidebar collapse and expand", async ({ page }) => {
//     const sidebar = page.locator("aside");

//     await expect(sidebar).toBeVisible();

//     const collapse = sidebar.getByRole("button");

//     await collapse.click();

//     await expect(
//       page.getByText("CoachGenie")
//     ).toHaveCount(0);

//     await collapse.click();

//     await expect(
//       page.getByText("CoachGenie")
//     ).toBeVisible();
//   });

//   test("dashboard menu active", async ({ page }) => {
//     const dashboard = page.getByRole("link", {
//       name: "Dashboard",
//     });

//     await expect(dashboard).toHaveAttribute(
//       "class",
//       /bg-primary\/10/
//     );
//   });

//   test("navigate to students", async ({ page }) => {
//     await page.getByRole("link", {
//       name: "Students",
//     }).click();

//     await expect(page).toHaveURL(/students/);
//   });

//   test("navigate to fees", async ({ page }) => {
//     await page.getByRole("link", {
//       name: "Fees",
//     }).click();

//     await expect(page).toHaveURL(/fees/);
//   });

//   test("career guidance opens in new tab", async ({ page }) => {
//     const link = page.getByRole("link", {
//       name: /Career Guidance/i,
//     });

//     await expect(link).toHaveAttribute(
//       "target",
//       "_blank"
//     );

//     await expect(link).toHaveAttribute(
//       "rel",
//       /noopener/
//     );
//   });

//   test("sidebar icons remain after collapse", async ({ page }) => {
//     const sidebar = page.locator("aside");

//     await sidebar.getByRole("button").click();

//     await expect(
//       sidebar.locator("svg").first()
//     ).toBeVisible();
//   });

//   test("no horizontal scrollbar", async ({ page }) => {
//     const overflow = await page.evaluate(() => {
//       return document.documentElement.scrollWidth >
//         document.documentElement.clientWidth;
//     });

//     expect(overflow).toBeFalsy();
//   });

//   test("main content visible", async ({ page }) => {
//     await expect(
//       page.getByRole("heading", {
//         name: "Dashboard",
//       })
//     ).toBeVisible();
//   });

//   test("page refresh keeps layout", async ({ page }) => {
//     await page.reload();

//     await expect(
//       page.getByText("CoachGenie")
//     ).toBeVisible();

//     await expect(
//       page.getByRole("heading", {
//         name: "Dashboard",
//       })
//     ).toBeVisible();
//   });
// });



import { test, expect } from "@playwright/test";
import { loginAsOwner } from "../helpers/auth";

test.describe("App Shell", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("renders application shell", async ({ page }) => {
   await expect(
  page.getByTestId("sidebar")
).toBeVisible();
    await expect(
  page.getByTestId("topbar")
).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /Dashboard/i })
    ).toBeVisible();
  });

  test("sidebar is visible", async ({ page }) => {
    await expect(page.locator("aside")).toBeVisible();
  });

  test("topbar is visible", async ({ page }) => {
    await expect(page.getByTestId("topbar")).toBeVisible();
  });

  test("main content is visible", async ({ page }) => {
    await expect(
  page.getByTestId("main-content")
).toBeVisible();
  });

  test("dashboard loads after login", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });

  test("sidebar contains expected menus", async ({ page }) => {
    const menus = [
      "Dashboard",
      "Leads",
      "Admissions",
      "Students",
      "Batches",
      "Exams",
      "Attendance",
      "Fees",
      "Notifications",
      "Settings",
    ];

    for (const menu of menus) {
      await expect(
       page.getByRole("link", {
    name: menu,
    exact: true,
})
      ).toBeVisible();
    }
  });

  test("dashboard card renders", async ({ page }) => {
    await expect(
      page.getByText(/Total Students/i)
    ).toBeVisible();

    await expect(
      page.getByText(/Attendance Rate/i)
    ).toBeVisible();
  });

  test("page refresh keeps user logged in", async ({ page }) => {
    await page.reload();

    await expect(page).toHaveURL(/dashboard/);

    await expect(
      page.getByRole("heading", {
        name: /Dashboard/i,
      })
    ).toBeVisible();
  });

  test("layout has no horizontal scrollbar", async ({ page }) => {
    const hasOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(hasOverflow).toBeFalsy();
  });

  test("dashboard scrolls correctly", async ({ page }) => {
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );

    await expect(
      page.getByText(/AI Copilot/i)
    ).toBeVisible();
  });

  test("career guidance link opens in new tab", async ({ page }) => {
    const link = page.getByRole("link", {
      name: /Career Guidance/i,
    });

    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("dashboard menu is active", async ({ page }) => {
    await expect(
      page.getByRole("link", {
        name: "Dashboard",
      })
    ).toHaveAttribute("class", /bg-primary/);
  });
});