import { defineConfig, devices } from '@playwright/test';

/** Runs against tests/email-verification/compose.yml and its disposable database. */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'account-email-verification*.spec.ts',
  workers: 1,
  reporter: 'line',
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
