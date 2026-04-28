// S-UI-3 — First-message thread creation + thread auto-naming.
//
// On /w/chat (no thread), type a message and send. Verify:
//   1. Thread is created server-side (URL transitions to /w/chat/<uuid>)
//   2. No "Request timed out" error appears (finding #11 — AbortController race)
//   3. Assistant reply renders within 30s
//   4. Sidebar thread title transitions from "New conversation" to a real
//      auto-generated title within 60s (Gregg's correction — explicit verify)
//
// Per Gregg's correction (3): finding #11 is the AbortController race that
// produces a fake 1-second "timeout" — we explicitly poll for that error and
// fail if it surfaces.

import { test, expect } from '../helpers/fixtures';
import { config } from '../config';
import { gotoChat, waitForThreadUrl } from '../helpers/navigation';
import {
  sendMessage,
  expectNoTimeoutError,
  expectReplyRendered,
  expectThreadAutoNamed,
} from '../helpers/chat';

test.describe('S-UI-3: First message creates thread + thread auto-names', () => {
  test('typing and sending a message creates a thread + URL transitions', async ({
    authedPage,
  }) => {
    const { page } = authedPage;
    await gotoChat(page);

    const msg = config.testMessages.firstMessage;

    // Run the no-timeout watchdog in parallel with the send so we can detect
    // the AbortController race (finding #11) firing within ~1s of submit.
    const watchdog = expectNoTimeoutError(page, 5_000);
    await sendMessage(page, msg);

    // URL must transition from /w/chat to /w/chat/<uuid> within 30s.
    const threadId = await waitForThreadUrl(page, 30_000);
    expect(threadId).toMatch(/^[0-9a-f-]{36}$/);

    // The watchdog must finish without throwing (no timeout banner).
    await watchdog;
  });

  // ── Expected-fail: finding #11, fake 1s "timeout" ──
  // Same as above but isolated as a dedicated case so a future fix is
  // unambiguous. Currently marked .fail() because the AbortController race
  // is still open as of 2026-04-27.
  test.fail(
    'no "Request timed out" error appears after first send (currently fails — finding #11)',
    async ({ authedPage }) => {
      const { page } = authedPage;
      await gotoChat(page);

      // Set the watchdog window tight so the test fails on the 1s race.
      const watchdog = expectNoTimeoutError(page, 3_000);
      await sendMessage(page, config.testMessages.firstMessage);
      await watchdog;
    },
  );

  test('assistant reply renders within 30s', async ({ authedPage }) => {
    const { page } = authedPage;
    await gotoChat(page);

    const msg = config.testMessages.firstMessage;
    await sendMessage(page, msg);
    await waitForThreadUrl(page, 30_000);
    await expectReplyRendered(page, msg, config.timeouts.aiReply);
  });

  test('thread title auto-names within 60s of first reply', async ({ authedPage }) => {
    const { page } = authedPage;
    await gotoChat(page);

    const msg = config.testMessages.firstMessage;
    await sendMessage(page, msg);
    await waitForThreadUrl(page, 30_000);
    await expectReplyRendered(page, msg, config.timeouts.aiReply);

    // After the reply lands, the title in the sidebar should transition off
    // the "New conversation" placeholder. We accept any non-placeholder
    // string (typically derived from the user message or summary).
    const finalTitle = await expectThreadAutoNamed(
      page,
      'New conversation',
      config.timeouts.threadAutoName,
    );
    expect(finalTitle).not.toBe('New conversation');
    expect(finalTitle.length).toBeGreaterThan(0);
  });
});
