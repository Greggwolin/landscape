// S-UI-1 — Auth flow.
//
// Per Gregg's correction: there is NO populated dashboard yet. Don't assert
// one exists. Verify login succeeds, sidebar exists, no auth errors.
//
// Findings this catches: #13 (no auto-redirect on 401), broken logout link.
// test.fail() markers were removed when the fix landed — these tests now
// stand as regression detectors for finding #13.

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

  // ── Finding #13 regression detector (auto-redirect on 401) ──
  // The fix wires src/lib/authHeaders.ts:redirectToLoginExpired() into
  // useLandscaperThreads.ts and AuthContext init. If the redirect ever
  // breaks, this test fails and we know finding #13 is back.
  test('expired token should auto-redirect to /login', async ({ capturedPage }) => {
    const { page } = capturedPage;
    await login(page);
    await gotoChat(page);

    // Clobber the JWT, then trigger an authenticated fetch.
    await expireToken(page);

    // Force a navigation that triggers an authed fetch (useLandscaperThreads
    // calls /api/landscaper/threads on mount).
    await page.goto(config.routes.chat);

    // Should land on /login (with ?expired=1 marker) within 5s.
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    expect(page.url()).toMatch(/expired=1/);
  });

  // ── Finding #13b regression detector (logout button) ──
  // The sign-out button is rendered directly in the WrapperSidebar footer
  // (no profile dropdown — that mental model from the original test was
  // incorrect). The button is icon-only with aria-label="Sign out".
  test('logout button reaches login screen', async ({ capturedPage }) => {
    const { page } = capturedPage;
    await login(page);
    await gotoChat(page);

    const logoutBtn = page.getByRole('button', { name: /sign\s*out/i }).first();
    await logoutBtn.click({ timeout: 5_000 });

    await page.waitForURL(/\/login/, { timeout: 5_000 });
  });

  test.afterEach(async ({ capturedPage }) => {
    // Best-effort cleanup so subsequent tests start fresh.
    await logout(capturedPage.page).catch(() => { /* ignore */ });
  });
});
