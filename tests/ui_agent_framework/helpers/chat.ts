// Chat helpers — send a message, wait for the URL to transition, wait for
// the assistant reply, watch for the AbortController-race "Request timed out"
// error (finding #11).

import { expect, type Page } from '@playwright/test';
import { config } from '../config';
import { selectors } from './selectors';

/**
 * Type a message into the chat textarea and submit via Enter. Does NOT wait
 * for any post-send state — the caller chooses whether to wait for thread URL,
 * reply rendering, or both.
 *
 * IMPORTANT: We submit via Enter (not by clicking the Send button) because
 * Next.js dev mode injects a <nextjs-portal> overlay that intercepts pointer
 * events on top of the page. Clicks on the Send button get caught by that
 * portal and never reach the React handler — surfaces in Playwright traces
 * as: "<nextjs-portal>... subtree intercepts pointer events / retrying click
 * action" until the test timeout.
 *
 * The chat textarea has an onKeyDown handler (LandscaperChatThreaded.tsx)
 * that calls handleSend() on Enter (without Shift). Keyboard events dispatch
 * directly to the focused element, bypassing the portal. As a side benefit,
 * Enter-to-send is also the actual user behavior we want to test.
 *
 * If the textarea's keyboard path is ever decoupled from the click path,
 * a force-clicking fallback is below.
 */
export async function sendMessage(page: Page, text: string): Promise<void> {
  const ta = page.locator(selectors.centerChat.textarea).first();
  await ta.waitFor({ state: 'visible', timeout: config.timeouts.pageLoad });

  // fill() focuses the element, sets the value via the native setter, and
  // dispatches input/change events. After this, React's onChange has fired
  // and the textarea is the focused element.
  await ta.fill(text);

  // Sanity-check the Send button is enabled — same gating signal the user
  // would observe (input non-empty AND not loading). If it's disabled, the
  // textarea is also locked (isThreadLoading or isLoading), and Enter would
  // be a no-op too. Keep this so we get a clear error message instead of a
  // mysterious "Enter was pressed but nothing happened".
  const sendBtn = page.locator(selectors.centerChat.sendButton).first();
  await expect(sendBtn).toBeEnabled({ timeout: 5_000 });

  // Submit via Enter. The onKeyDown handler in LandscaperChatThreaded calls
  // handleSend() on Enter (without Shift). Keyboard events dispatch to the
  // focused element directly — no portal interception.
  await ta.press('Enter');
}

/**
 * Assert that the "Request timed out — the operation may still be processing"
 * banner does NOT appear within `windowMs`. Used in S-UI-3 to catch the
 * AbortController-race bug (finding #11).
 */
export async function expectNoTimeoutError(page: Page, windowMs = 5_000): Promise<void> {
  // Negative assertion: poll for the banner, fail the test if it shows up.
  const start = Date.now();
  while (Date.now() - start < windowMs) {
    const matches = await page
      .locator('text=/Request timed out/i')
      .count()
      .catch(() => 0);
    if (matches > 0) {
      throw new Error('"Request timed out" banner appeared — finding #11 (AbortController race)');
    }
    await page.waitForTimeout(250);
  }
}

/**
 * Wait for the assistant's reply to render.
 *
 * ChatMessageBubble (src/components/landscaper/ChatMessageBubble.tsx) renders
 * each message as a Bootstrap-utility div: `align-items-end` for user, and
 * `align-items-start` for assistant. We detect the assistant reply by looking
 * for the first `.align-items-start` bubble inside the chat panel. Polling
 * because we want the FIRST one to appear (it may take 30s for a real
 * Anthropic round-trip).
 */
export async function expectReplyRendered(
  page: Page,
  userMessageText: string,
  timeoutMs = config.timeouts.aiReply,
): Promise<void> {
  void userMessageText; // kept in signature for caller-side context; not used in selector
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const assistantBubbles = page.locator(
      '.wrapper-chat-center .d-flex.flex-column.align-items-start',
    );
    const count = await assistantBubbles.count().catch(() => 0);
    if (count > 0) {
      // First assistant bubble must have non-empty text (LandscaperProgress
      // can render an empty placeholder during streaming). Confirm content.
      const firstText = await assistantBubbles.first().innerText().catch(() => '');
      if (firstText.trim().length > 0) return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Assistant reply did not render within ${timeoutMs}ms after sending "${userMessageText.slice(0, 60)}…"`,
  );
}

/**
 * Find the active thread item in the sidebar (the one with a green/active
 * status dot). Returns the locator for further assertions on its label.
 */
export function activeSidebarThread(page: Page) {
  return page.locator(`${selectors.sidebar.threadItem}:has(${selectors.sidebar.activeThreadDot})`).first();
}

/**
 * Poll the sidebar's active thread label for up to `timeoutMs`, asserting
 * it eventually transitions to a non-placeholder title. Used by S-UI-3.
 */
export async function expectThreadAutoNamed(
  page: Page,
  placeholderTitle = 'New conversation',
  timeoutMs = config.timeouts.threadAutoName,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const label = await activeSidebarThread(page).innerText().catch(() => '');
    const trimmed = label.trim();
    if (trimmed && trimmed !== placeholderTitle && !trimmed.startsWith('New conversation')) {
      return trimmed;
    }
    await page.waitForTimeout(2_000);
  }
  throw new Error(
    `Thread did not auto-name within ${timeoutMs}ms (last seen: "${
      await activeSidebarThread(page).innerText().catch(() => '<not found>')
    }")`,
  );
}
