// S-UI-1 — Auth flow.
//
// Per Gregg's correction: there is NO populated dashboard yet. Don't assert
// one exists. Verify login succeeds, sidebar exists, no auth errors.
//
// Findings this catches: #13 (no auto-redirect on 401), broken logout link.
// Both expected-fail tests are marked test.fail() so the suite stays green
// while the underlying bugs are open. Remove the .fail() annotation when
// each fix lands.

import { test, expect } from '../helpers/fixtures';
import { config } from '../config';
import { selectors } from '../helpers/selectors';
import { login, logout, expireToken } from '../helpers/auth';
import { gotoChat } from '../helpers/navigation';

test.describe('S-UI-1: Auth flow', () => {
  test('fresh login completes and lands on a logged-in route', async ({ capturedPage }) => {
    const { page, capture } = capturedPage;

    await login(page);

    // URL must NOT still be /login
    expect(page.url()).not.toContain('/login');

    // Sidebar should be present somewhere — either /dashboard renders the
    // legacy ARGUS shell or unified-UI shell. We accept either by checking
    // for any visible navigation element.
    // Per Gregg's correction: don't assert a populated dashboard. Just that
    // the user is no longer on /login and the page rendered something.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);

    // No 401s during the login round-trip.
    const authErrors = capture.getAuthErrors();
    const authPath4xx = authErrors.filter((e) => e.url.includes('/api/auth/') && e.status === 401);
    // Login itself may produce a transient 401 if creds are wrong; the test's
    // success means the redirect happened, so 401 here would be a real bug.
    expect(authPath4xx).toHaveLength(0);
  });

  test('navigation to /w/chat after login renders unified-UI shell', async ({ capturedPage }) => {
    const { page } = capturedPage;
    await login(page);
    await gotoChat(page);

    // Sidebar must be visible
    await expect(page.locator(selectors.sidebar.root)).toBeVisible();
    // New chat button must be present (the canonical entry point)
    await expect(page.locator(selectors.sidebar.newChatButton)).toBeVisible();
  });

  // ── Expected-fail block: finding #13 (no auto-redirect on 401) ──
  test.fail(
    'expired token should auto-redirect to /login (currently fails — finding #13)',
    async ({ capturedPage }) => {
      const { page } = capturedPage;
      await login(page);
      await gotoChat(page);

      // Clobber the JWT, then trigger an authenticated fetch (any sidebar
      // refresh will do). Per finding #13, the app does NOT detect the 401
      // and redirect — instead it silently returns empty data.
      await expireToken(page);

      // Force a navigation that triggers an authed fetch
      await page.goto(config.routes.chat);

      // Expectation (currently failing): URL becomes /login within 5s.
      await page.waitForURL(/\/login/, { timeout: 5_000 });
    },
  );

  // ── Expected-fail block: finding #13b (broken logout link) ──
  test.fail(
    'logout button reaches login screen (currently fails — broken link)',
    async ({ capturedPage }) => {
      const { page } = capturedPage;
      await login(page);

      // Open the profile dropdown, click logout. Selectors here are best-guess
      // since the dropdown is reportedly broken — this test exists to alert
      // when the logout flow is restored.
      const profileTrigger = page.locator('[aria-label*="profile" i], [aria-label*="user" i]').first();
      if (await profileTrigger.count()) {
        await profileTrigger.click();
        const logoutBtn = page.locator('text=/log\\s*out|sign\\s*out/i').first();
        await logoutBtn.click({ timeout: 5_000 });
      } else {
        throw new Error('Profile trigger not found — logout dropdown not exposed yet');
      }
      await page.waitForURL(/\/login/, { timeout: 5_000 });
    },
  );

  test.afterEach(async ({ capturedPage }) => {
    // Best-effort cleanup so subsequent tests start fresh.
    await logout(capturedPage.page).catch(() => { /* ignore */ });
  });
});
