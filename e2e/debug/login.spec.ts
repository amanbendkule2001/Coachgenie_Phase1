import { test } from "@playwright/test";
import { loginAsOwner } from "../helpers/auth";

test("login debug", async ({ page }) => {
  await loginAsOwner(page);
});