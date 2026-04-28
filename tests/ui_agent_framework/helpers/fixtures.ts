/* eslint-disable react-hooks/rules-of-hooks --
 * The `use` parameter in Playwright fixtures is unrelated to React's
 * `use()` hook. The react-hooks lint plugin pattern-matches the name and
 * reports false positives here. */

// Custom Playwright fixture that combines:
//   - authenticated page (logs in once per test)
//   - console capture (S-UI-8 — fails any test producing critical errors)
//
// Use `test` from this file instead of `@playwright/test` to get both behaviors:
//   import { test, expect } from '../helpers/fixtures';
//
// The `consoleCapture` fixture is exposed so individual specs can also
// inspect captured network errors/console state for assertions.

import { test as baseTest, expect } from '@playwright/test';
import { login } from './auth';
import { captureConsole, type ConsoleCapture } from './console-capture';

interface UIFixtures {
  /** A page with console+network capture attached (no login). */
  capturedPage: { page: import('@playwright/test').Page; capture: ConsoleCapture };
  /** A page with console capture AND a logged-in session. */
  authedPage: { page: import('@playwright/test').Page; capture: ConsoleCapture };
}

export const test = baseTest.extend<UIFixtures>({
  capturedPage: async ({ page }, use) => {
    const capture = captureConsole(page);
    await use({ page, capture });

    // S-UI-8 console-hygiene gate — fail the test if critical errors fired.
    const critical = capture.getCriticalErrors();
    if (critical.length > 0) {
      const summary = critical
        .map((e) => `[${e.type}] ${e.text.slice(0, 200)}`)
        .join('\n');
      throw new Error(
        `S-UI-8 console hygiene failure — ${critical.length} critical console error(s):\n${summary}`,
      );
    }
  },

  authedPage: async ({ page }, use) => {
    const capture = captureConsole(page);
    await login(page);
    await use({ page, capture });

    const critical = capture.getCriticalErrors();
    if (critical.length > 0) {
      const summary = critical
        .map((e) => `[${e.type}] ${e.text.slice(0, 200)}`)
        .join('\n');
      throw new Error(
        `S-UI-8 console hygiene failure — ${critical.length} critical console error(s):\n${summary}`,
      );
    }
  },
});

export { expect };
