// UI E2E test config — separate from playwright.config.ts so this suite
// can run independently and use a different testDir.
//
// Inherits the macOS Sonoma headless hardening (system Chrome, crash dump
// settings) from the base config — the unified-UI suite has the same
// platform constraints.
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: './tests/ui_agent_framework/scenarios',
  // 60s per test — first-message paths can take 30s+ for an AI reply.
  timeout: 60_000,
  // expect timeouts default to 5s; assertions on AI replies need more.
  expect: { timeout: 30_000 },
  // Retry once on flake (network jitter against local dev). 0 in CI.
  retries: process.env.CI ? 0 : 1,
  // Single worker — these are stateful tests sharing a dev server, parallelism
  // would race on thread creation order in the sidebar.
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report-ui', open: 'never' }],
    ['list'],
  ],
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:3000',
    // Capture artifacts on failure for debugging.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
