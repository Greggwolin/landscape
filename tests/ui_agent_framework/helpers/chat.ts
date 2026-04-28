// Chat helpers — send a message, wait for the URL to transition, wait for
// the assistant reply, watch for the AbortController-race "Request timed out"
// error (finding #11).

import { expect, type Page } from '@playwright/test';
import { config } from '../config';
import { selectors } from './selectors';

/**
 * Type a message into the chat textarea and click Send. Does NOT wait for
 * any post-send state — the caller chooses whether to wait for thread URL,
 * reply rendering, or both.
 */
export async function sendMessage(page: Page, text: string): Promise<void> {
  const ta = page.locator(selectors.centerChat.textarea).first();
  await ta.waitFor({ state: 'visible', timeout: config.timeouts.pageLoad });
  await ta.fill(text);
  const sendBtn = page.locator(selectors.centerChat.sendButton).first();
  await sendBtn.waitFor({ state: 'visible' });
  await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
  await sendBtn.click();
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
 * Wait for the assistant's reply to render. Detection: a message bubble
 * appears that is NOT the user message we just sent. Best-effort selector
 * since LandscaperChatThreaded uses Bootstrap-ish classes for messages.
 */
export async function expectReplyRendered(
  page: Page,
  userMessageText: string,
  timeoutMs = config.timeouts.aiReply,
): Promise<void> {
  // The reply lives inside the chat body; we look for a message element
  // whose text doesn't include the user's input. Use a count poll to avoid
  // brittle structural assumptions about which element is the assistant.
  const start = Date.now();
  let lastCount = 0;
  while (Date.now() - start < timeoutMs) {
    const messages = page.locator('.wrapper-chat-body :is(.message, [data-role], .markdown-body)');
    const count = await messages.count().catch(() => 0);
    if (count > 1) {
      // At least 2 messages → user + assistant. Confirm at least one isn't ours.
      const allText = await messages.allInnerTexts().catch(() => [] as string[]);
      const otherThanUser = allText.some(
        (t) => !!t && !t.includes(userMessageText),
      );
      if (otherThanUser) return;
    }
    if (count !== lastCount) lastCount = count;
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
