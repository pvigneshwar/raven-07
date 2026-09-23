import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-smoke.spec.ts',
  timeout: 30000,
  workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5176',
    headless: true, viewport: { width: 1280, height: 720 } },
});
