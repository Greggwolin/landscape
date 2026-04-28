// S-UI-2 — /w/chat baseline rendering.
//
// What it tests: after fresh login, /w/chat renders cleanly within a few
// seconds. Sidebar populates, center panel renders (or shows a clean empty
// state, NOT a 10s spinner), right artifact panel exists with a toggle.
//
// Findings this catches: #7 (setState-during-render — caught by S-UI-8 fixture
// wrapper), #8 (10s "Loading conversations" — gated by 5s threshold), #14
// (empty center / missing right panel).
//
// Tests marked test.fail() are expected to fail until the underlying fixes
// land. Remove .fail() as fixes ship.

import { test, expect } from '../helpers/fixtures';
import { config } from '../config';
import { selectors } from '../helpers/selectors';
import { gotoChat } from '../helpers/navigation';

test.describe('S-UI-2: /w/chat baseline', () => {
  test('sidebar root + new-chat button render', async ({ authedPage }) => {
    const { page } = authedPage;
    await gotoChat(page);

    await expect(page.locator(selectors.sidebar.root)).toBeVisible();
    await expect(page.locator(selectors.sidebar.newChatButton)).toBeVisible();
  });

  test('center panel mounts without long-running loading state', async ({ authedPage }) => {
    const { page } = authedPage;
    await gotoChat(page);

    // Center panel root must be present immediately
    await expect(page.locator(selectors.centerChat.root)).toBeVisible({ timeout: 5_000 });

    // Per finding #8, a "Loading conversations" or similar spinner currently
    // hangs for ~10s. We assert it's gone within 5s (tightened threshold).
    // If this fails, finding #8 is still active.
    await expect(page.locator(selectors.centerChat.loadingMarker)).toHaveCount(0, {
      timeout: 5_000,
    });
  });

  // ── Expected-fail: right panel missing on /w/chat (finding #14) ──
  test.fail(
    'right artifact panel exists with a toggle on /w/chat (currently fails — finding #14)',
    async ({ authedPage }) => {
      const { page } = authedPage;
      await gotoChat(page);

      // Either the expanded panel OR the collapsed strip should exist.
      const expandedCount = await page.locator(selectors.artifacts.panelExpanded).count();
      const collapsedCount = await page.locator(selectors.artifacts.panelCollapsed).count();
      expect(expandedCount + collapsedCount).toBeGreaterThan(0);
    },
  );

  test('sidebar populates (or renders clean empty state) within 30s', async ({ authedPage }) => {
    const { page } = authedPage;
    await gotoChat(page);

    // Either threads render OR a "no recent threads" placeholder appears.
    // Both states resolve within the sidebar's 30s budget.
    const threadOrEmpty = page.locator(
      `${selectors.sidebar.threadItem}, text=/No recent threads|No threads yet/i`,
    );
    await expect(threadOrEmpty.first()).toBeVisible({
      timeout: config.timeouts.sidebarPopulate,
    });
  });
});
