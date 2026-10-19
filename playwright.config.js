import { defineConfig, devices } from "@playwright/test";

// E2E against the production build served by `vite preview`, so the real CSP is in force.
// First run: npx playwright install chromium
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173/",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
