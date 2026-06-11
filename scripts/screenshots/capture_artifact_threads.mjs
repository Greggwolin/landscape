/**
 * Landscape chat-driven UI screenshot capture — artifact threads
 * Session: LSCMD-CW-SCREENSHOTS-0610-ZK19 (companion to capture_screenshots.mjs)
 *
 * Captures the unified chat-first UI with REAL content: opens existing
 * Chadron Terrace chat threads that already contain Landscaper-generated
 * artifacts, clicks the artifact card so it renders in the right panel,
 * and screenshots the full 3-panel view.
 *
 * NAVIGATION ONLY — clicking an artifact card just displays an existing
 * artifact; nothing is created, sent, or modified.
 *
 * Usage:
 *   LANDSCAPE_USER=... LANDSCAPE_PASS=... node scripts/screenshots/capture_artifact_threads.mjs
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.LANDSCAPE_BASE_URL || 'http://localhost:3000';
const USER = process.env.LANDSCAPE_USER;
const PASS = process.env.LANDSCAPE_PASS;

if (!USER || !PASS) {
  console.error('ERROR: set LANDSCAPE_USER and LANDSCAPE_PASS environment variables.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const OUT_DIR = path.join(repoRoot, 'reference', 'images', 'screenshots', `capture-artifacts-${stamp}`);

const SETTLE_MS = 2000;
const NAV_TIMEOUT = 45_000;

/**
 * Threads verified in the DB on 2026-06-11 — all Chadron Terrace (project 17),
 * all already contain Landscaper-generated artifacts. The script opens each
 * thread and clicks the LAST artifact card so the newest artifact renders in
 * the right panel.
 *   name        — file name stem
 *   threadId    — landscaper_chat_thread.id (UUID)
 *   cardTitle   — optional: exact artifact title to click instead of the last card
 *   note        — what the shot shows
 */
const THREADS = [
  { name: 'wa-investment-memo', threadId: 'e7b74b2d-234c-4bc4-970a-6bd7696e3f9d',
    note: 'Chadron Terrace — Investment Memorandum artifact in right panel (rent roll analysis chat)' },
  { name: 'wa-ic-memo', threadId: 'fac0ad47-6176-4ba5-8165-f97334df4fa4',
    note: 'Investment Committee Memorandum artifact' },
  { name: 'wa-cash-on-cash', threadId: '604fb517-10ca-45dd-8b44-78f10a3259ac',
    note: 'Cash-on-Cash Return Analysis ($15M purchase price) — chat-driven what-if' },
  { name: 'wa-investment-analysis', threadId: 'b3f588f3-1871-40df-88e7-7f2148e46511',
    note: 'Investment Analysis narrative artifact (pros/cons) — replaces archived unit-mix thread, which 404s in the app' },
  { name: 'wa-t12-operating', threadId: '138c5953-ed08-4d07-8ca6-1fee3ba0534d',
    note: 'T-12 Operating Statement artifact — "describe the deal, it builds the model"' },
];

function log(msg) { console.log(`[capture] ${msg}`); }

async function settle(page, extraMs = 0) {
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(SETTLE_MS + extraMs);
}

async function login(page) {
  log(`logging in at ${BASE_URL}/login as ${USER}`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForSelector('#username', { timeout: NAV_TIMEOUT });
  // Let the mount-time expired-session redirect fire before typing (see main script).
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.waitForSelector('#username', { timeout: NAV_TIMEOUT });

  let filled = false;
  for (let attempt = 1; attempt <= 5 && !filled; attempt++) {
    await page.fill('#username', USER);
    await page.fill('#password', PASS);
    await page.waitForTimeout(400);
    const v = await page.evaluate(() => ({
      u: document.querySelector('#username')?.value || '',
      p: document.querySelector('#password')?.value || '',
    }));
    filled = v.u === USER && v.p === PASS;
  }
  if (!filled) throw new Error('login fields would not stay populated');

  const tos = page.locator('input[type="checkbox"]');
  if (await tos.count() > 0 && await tos.first().isVisible().catch(() => false)) {
    await tos.first().check();
    await page.waitForTimeout(300);
  }
  await page.click('button[type="submit"]');
  await page.waitForURL('**/w/dashboard**', { timeout: NAV_TIMEOUT });
  await settle(page);
  log('  login OK');
}

async function captureThread(page, t) {
  log(`${t.name} → /w/chat/${t.threadId}`);
  await page.goto(`${BASE_URL}/w/chat/${t.threadId}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await settle(page, 1000);

  // Artifact cards render inline in chat with aria-label="Open artifact: <title>".
  // Click the requested one (by title) or the last (newest) card in the thread.
  const cards = page.locator('[aria-label^="Open artifact"]');
  const count = await cards.count();
  if (count === 0) {
    log(`  WARN: no artifact cards found in thread — capturing chat as-is`);
  } else {
    const target = t.cardTitle
      ? page.locator(`[aria-label="Open artifact: ${t.cardTitle}"]`).last()
      : cards.last();
    await target.scrollIntoViewIfNeeded();
    await target.click();
    log(`  opened artifact card (${count} card(s) in thread)`);
    await settle(page, 1500); // let the right panel render the artifact
  }

  await page.screenshot({ path: path.join(OUT_DIR, `${t.name}.png`) });

  // _b: scroll the artifact panel's internal scroller one viewport for long artifacts
  const scrolled = await page.evaluate(() => {
    let tallest = null;
    for (const el of document.querySelectorAll('aside *, [class*="rtifact"] *')) {
      if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300) {
        if (!tallest || el.scrollHeight > tallest.scrollHeight) tallest = el;
      }
    }
    if (tallest) { tallest.scrollBy(0, tallest.clientHeight); return true; }
    return false;
  });
  if (scrolled) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, `${t.name}_b.png`) });
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  log(`output → ${OUT_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-crashpad', '--crash-dumps-dir=/tmp'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  // Keep the Help flyout closed (same fix as the main capture script).
  await context.addInitScript(() => {
    try { sessionStorage.setItem('landscape_help_dismissed', 'true'); } catch {}
  });
  const page = await context.newPage();

  const failures = [];
  try {
    await login(page);
    for (const t of THREADS) {
      try { await captureThread(page, t); }
      catch (err) { failures.push({ view: t.name, error: String(err).slice(0, 200) }); log(`  FAIL ${t.name}: ${err}`); }
    }
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(OUT_DIR).sort();
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({
    session: 'LSCMD-CW-SCREENSHOTS-0610-ZK19',
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    expectedViews: THREADS.map(t => t.name),
    files, failures,
  }, null, 2));
  log(`done — ${files.length} files in ${OUT_DIR}`);
  if (failures.length) process.exitCode = 1;
})();
