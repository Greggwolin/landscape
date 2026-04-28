// Navigation helpers — gotoChat, gotoProject. Both wait for the unified-UI
// shell to render before returning, so callers can immediately assert on
// downstream state without timing out on the wrapper sidebar mount.

import type { Page } from '@playwright/test';
import { config } from '../config';
import { selectors } from './selectors';

export async function gotoChat(page: Page): Promise<void> {
  await page.goto(config.routes.chat);
  // Sidebar must mount — its presence is the canonical "the unified-UI shell
  // is alive" signal.
  await page.waitForSelector(selectors.sidebar.root, {
    timeout: config.timeouts.pageLoad,
  });
  // Center panel root must mount too — even if it shows a loading spinner,
  // the .wrapper-chat-center container should be present.
  await page.waitForSelector(selectors.centerChat.root, {
    timeout: config.timeouts.pageLoad,
  });
}

export async function gotoProject(page: Page, projectId: number | string): Promise<void> {
  await page.goto(config.routes.project(projectId));
  await page.waitForSelector(selectors.sidebar.root, {
    timeout: config.timeouts.pageLoad,
  });
}

/** Wait for the URL to transition from /w/chat to /w/chat/<uuid>. */
export async function waitForThreadUrl(page: Page, timeoutMs = 30_000): Promise<string> {
  await page.waitForURL(/\/w\/chat\/[0-9a-f]{8}-/, { timeout: timeoutMs });
  const url = page.url();
  const match = url.match(/\/w\/chat\/([0-9a-f-]{36})/);
  if (!match) throw new Error(`URL did not match thread pattern: ${url}`);
  return match[1];
}
