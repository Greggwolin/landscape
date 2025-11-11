// Version: v1.0 (2025-11-09) — Sonoma headless hardening
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    headless: true,
    // Prefer system notarized Chrome; avoid cached ms-playwright Chromium.
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    launchOptions: {
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--crash-dumps-dir=/tmp',
        '--disable-crashpad',
        '--enable-crashpad=false',
      ],
      env: {
        HOME: process.env.PLAYWRIGHT_FAKE_HOME || '/tmp/pw-playwright',
        CHROME_CRASH_REPORTER_DISABLE: '1',
      },
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // Temporarily disable bundled channels that trigger Crashpad sandbox issues:
    // // // // { name: 'webkit', use: { browserName: 'webkit' } },
    // // // // { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});

// To re-enable bundled browsers later, run `pnpm playwright install chromium webkit firefox`
// (or the npm/yarn equivalent), then remove `executablePath` and un-comment other projects.
// See scripts below for diagnostics and toggles.
