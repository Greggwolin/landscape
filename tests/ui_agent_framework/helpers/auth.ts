// Auth helpers — login + logout + token expiry simulation.
//
// Login flow: navigate to /login, fill creds, submit. AuthContext.login() POSTs
// to /api/auth/login/ on Django, stores tokens in localStorage under
// `auth_tokens`, and redirects to /dashboard. We wait for any post-login
// route (not just /dashboard) so the helper works for users that redirect
// to /onboarding instead.

import type { Page } from '@playwright/test';
import { config } from '../config';
import { selectors } from './selectors';

export async function login(
  page: Page,
  username: string = config.credentials.username,
  password: string = config.credentials.password,
): Promise<void> {
  await page.goto(config.routes.login);
  await page.waitForSelector(selectors.login.usernameInput, { timeout: config.timeouts.pageLoad });

  await page.fill(selectors.login.usernameInput, username);
  await page.fill(selectors.login.passwordInput, password);

  // The login form gates submit on a TOS checkbox. State persists in
  // localStorage (`tosAcceptedByUser`) keyed by lowercased username, so
  // returning users skip this — but every fresh browser context shows the
  // checkbox unchecked. Check it if present and unchecked.
  // Refs: src/app/login/LoginForm.tsx:228 — disabled={... || (requiresTos && !tosAccepted)}
  const tosCheckbox = page.getByRole('checkbox', { name: /Terms of Service|Privacy Policy/i }).first();
  if (await tosCheckbox.count()) {
    const isChecked = await tosCheckbox.isChecked().catch(() => false);
    if (!isChecked) await tosCheckbox.check({ timeout: 2_000 }).catch(() => { /* ignore — submit will retry */ });
  }

  await page.click(selectors.login.submitButton);

  // After submit, AuthContext.login awaits the API, then router.push(target).
  // Wait for a logged-in route — any /w/* OR /dashboard OR /onboarding works.
  await page.waitForURL(/\/(dashboard|onboarding|w\/)/, {
    timeout: config.timeouts.pageLoad,
  });
}

export async function logout(page: Page): Promise<void> {
  // Profile-dropdown logout link is reportedly broken (finding #13b). Use the
  // belt-and-suspenders fallback so test cleanup is reliable regardless.
  await page.context().clearCookies();
  await page.evaluate(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    try { sessionStorage.clear(); } catch { /* ignore */ }
  });
}

/**
 * Simulate token expiry by clobbering the JWT in localStorage. The next
 * authenticated fetch should produce a 401, which (per finding #13) currently
 * does NOT auto-redirect — that test is marked test.fail() in S-UI-1.
 */
export async function expireToken(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.setItem(
        'auth_tokens',
        JSON.stringify({ access: 'invalid.jwt.token', refresh: 'invalid.refresh.token' }),
      );
    } catch { /* ignore */ }
  });
}
