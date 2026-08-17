import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
const result = dotenv.config({ path: ".env.test" });


/**
 * Place this file at the repo root (same level as `client/` and `backend/`).
 *
 * Assumes:
 *  - Frontend: client/apps/admin (Next.js, pnpm workspace) — dev server on :3000
 *  - Backend:  backend (FastAPI, uvicorn)                  — dev server on :8000
 *  - A dedicated TEST_DATABASE_URL, separate from your dev DB (see seed_test_db.py)
 *
 * NOTE: confirm the backend start command below — this assumes
 * `uvicorn app.main:app` from inside `backend/`. Adjust if yours differs.
 */

const FRONTEND_URL = "http://localhost:3000";
const BACKEND_URL = "http://localhost:8000";
// const BACKEND_URL = "http://localhost:8002";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false, // leads/stage tests share DB state — keep serial for now
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }]],

  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command: "pnpm --filter admin dev",
      cwd: "./client",
      url: FRONTEND_URL,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_URL: `${BACKEND_URL}/api/v1`,
      },
    },
    {
      // command: "uvicorn app.main:app --reload --port 8002",
      command: "uvicorn app.main:app --reload --port 8000",
      cwd: "./backend",
      url: `${BACKEND_URL}/docs`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      },
    },
  ],
});