/**
 * Landscape demo screenshot capture tool
 * Session: LSCMD-CW-SCREENSHOTS-0610-ZK19
 *
 * Logs into a locally-running Landscape app and captures demo-quality
 * screenshots of the chat-first (/w/) surface and the legacy folder/tab
 * surface. NAVIGATION ONLY — never clicks save/submit/delete, never
 * writes data. Built by Cowork; run by Claude Code.
 *
 * Usage:
 *   LANDSCAPE_USER=... LANDSCAPE_PASS=... node scripts/screenshots/capture_screenshots.mjs
 *
 * Env:
 *   LANDSCAPE_USER       (required) test-account username
 *   LANDSCAPE_PASS       (required) test-account password
 *   LANDSCAPE_BASE_URL   (optional) default http://localhost:3000
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─────────────────────────────────────────────────────────────────────────────
// TARGET PROJECTS — change here to feature different projects.
// Verified against the live DB on 2026-06-10:
//   9  = Peoria Meadows (land development — 43 parcels, 8 phases, budget data)
//   17 = Chadron Terrace (multifamily — 113 units, operating statement data)
// NOTE: there is no "Peoria Lakes" project; Peoria Meadows is the land demo.
const LAND_PROJECT_ID = 9;
const MF_PROJECT_ID = 17;
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.LANDSCAPE_BASE_URL || 'http://localhost:3000';
const USER = process.env.LANDSCAPE_USER;
const PASS = process.env.LANDSCAPE_PASS;

if (!USER || !PASS) {
  console.error('ERROR: set LANDSCAPE_USER and LANDSCAPE_PASS environment variables. No credentials are stored in this script.');
  process.exit(1);
}

// Output: timestamped folder under the repo's existing screenshots home.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); // YYYYMMDDHHMM
const OUT_DIR = path.join(repoRoot, 'reference', 'images', 'screenshots', `capture-${stamp}`);

// Per-view settle time after networkidle (animations, chart paints, font swaps)
const SETTLE_MS = 1800;
const NAV_TIMEOUT = 45_000;

/**
 * View list. Each entry:
 *   name      — file name stem ({name}.png, {name}_b.png)
 *   url       — path relative to BASE_URL
 *   waitFor   — optional CSS selector that must be present before capture
 *   belowFold — also capture a second, scrolled/full-page image as {name}_b.png
 *   fullPage  — when belowFold, capture _b as a full-page image (long reports/
 *               schedules end-to-end); otherwise _b is one viewport-height scroll
 *   note      — what the shot is meant to show (self-documenting list)
 */
const VIEWS = [
  // ── Chat-first surface (the headline) ──────────────────────────────────────
  { name: 'w-dashboard', url: '/w/dashboard', waitFor: '.sb-header',
    note: 'Home dashboard — recent chats, project tiles, artifacts rail' },
  { name: 'w-chat', url: '/w/chat', waitFor: '.sb-header',
    note: 'Landscaper chat, 3-panel: left nav + center chat + right panel — the "describe the deal, it builds the model" view' },
  { name: 'w-project-home', url: `/w/projects/${LAND_PROJECT_ID}`, waitFor: '.sb-header',
    note: 'Project homepage for the land demo — tile grid + chat-first navigation' },
  { name: 'w-project-documents', url: `/w/projects/${LAND_PROJECT_ID}/documents`, waitFor: '.sb-header', belowFold: true,
    note: 'Documents panel — extraction/DMS surface in the chat-first shell' },
  { name: 'w-project-map', url: `/w/projects/${LAND_PROJECT_ID}/map`, waitFor: 'canvas', extraSettleMs: 3000,
    note: 'GIS / parcel map in chat-first shell — strong for the land-development story' },
  { name: 'w-project-reports', url: `/w/projects/${LAND_PROJECT_ID}/reports`, waitFor: '.sb-header',
    note: 'Reports catalog in the chat-first shell' },

  // ── Legacy tab surface — land-development depth (Peoria Meadows) ───────────
  { name: 'land-overview', url: `/projects/${LAND_PROJECT_ID}?folder=home`,
    note: 'Project overview — KPIs and summary for the land MPC' },
  { name: 'land-land-use', url: `/projects/${LAND_PROJECT_ID}?folder=property&tab=land-use`,
    note: 'Land-use taxonomy (family/type/product) — land-dev differentiator' },
  { name: 'land-parcels', url: `/projects/${LAND_PROJECT_ID}?folder=property&tab=parcels`, belowFold: true,
    note: 'Parcel inventory — 43 parcels across 8 phases' },
  { name: 'land-budget-grid', url: `/projects/${LAND_PROJECT_ID}?folder=budget&tab=budget`, belowFold: true, fullPage: true,
    note: 'Budget grid — the development cost model' },
  { name: 'land-sales-absorption', url: `/projects/${LAND_PROJECT_ID}?folder=budget&tab=sales`, belowFold: true,
    note: 'Sales / absorption schedule — land-dev phasing differentiator close-up' },
  { name: 'land-cashflow', url: `/projects/${LAND_PROJECT_ID}?folder=feasibility&tab=cashflow`, belowFold: true, fullPage: true,
    note: 'Cash flow analysis — feasibility output end-to-end' },
  { name: 'land-returns', url: `/projects/${LAND_PROJECT_ID}?folder=feasibility&tab=returns`,
    note: 'Returns (IRR/NPV) — feasibility headline metrics' },
  { name: 'land-capitalization', url: `/projects/${LAND_PROJECT_ID}?folder=capital&tab=debt`,
    note: 'Capitalization — debt structure' },
  { name: 'land-reports', url: `/projects/${LAND_PROJECT_ID}?folder=reports`,
    note: 'Reports catalog — 20 generators, PDF/Excel export' },
  { name: 'land-documents', url: `/projects/${LAND_PROJECT_ID}?folder=documents&tab=all`,
    note: 'Document management — extracted data traced to source documents' },
  { name: 'land-map', url: `/projects/${LAND_PROJECT_ID}?folder=map`, waitFor: 'canvas', extraSettleMs: 3000,
    note: 'Legacy map view — GIS parcel overlay' },

  // ── Legacy tab surface — income-property depth (Chadron Terrace, MF) ───────
  { name: 'mf-operations', url: `/projects/${MF_PROJECT_ID}?folder=operations`, belowFold: true, fullPage: true,
    note: 'Operations P&L — the multifamily proforma / operating schedule' },
  { name: 'mf-rent-roll', url: `/projects/${MF_PROJECT_ID}?folder=property&tab=rent-roll`, belowFold: true,
    note: 'Rent roll — 113 units, AG-Grid' },
  { name: 'mf-income-approach', url: `/projects/${MF_PROJECT_ID}?folder=valuation&tab=income`, belowFold: true,
    note: 'Income approach output — Direct Cap + DCF, income-property differentiator close-up' },
  { name: 'mf-reconciliation', url: `/projects/${MF_PROJECT_ID}?folder=valuation&tab=reconciliation`,
    note: 'Valuation reconciliation — three-approach weighting and indicated value' },
];

// ─────────────────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[capture] ${msg}`);
}

async function settle(page, extraMs = 0) {
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT }).catch(() => {
    log('  networkidle timeout — continuing (long-polling endpoints can hold the connection open)');
  });
  await page.waitForTimeout(SETTLE_MS + extraMs);
}

async function login(page) {
  log(`logging in at ${BASE_URL}/login as ${USER}`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForSelector('#username', { timeout: NAV_TIMEOUT });

  // Settle BEFORE typing. On mount a background `GET /api/projects` 401s and
  // calls redirectToLoginExpired() → a hard `window.location.href` redirect to
  // /login?expired=1 (see src/lib/authHeaders.ts + src/app/w/layout.tsx). That
  // remounts the form and silently clears whatever was typed. Letting it fire
  // first, then verifying the values stuck, makes login deterministic.
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.waitForSelector('#username', { timeout: NAV_TIMEOUT });

  // Fill, then confirm both values stuck (controlled inputs); re-fill if the
  // form remounted under us.
  let filled = false;
  for (let attempt = 1; attempt <= 5 && !filled; attempt++) {
    await page.fill('#username', USER);
    await page.fill('#password', PASS);
    await page.waitForTimeout(400); // let React re-render (requiresTos → TOS checkbox)
    const v = await page.evaluate(() => ({
      u: document.querySelector('#username')?.value || '',
      p: document.querySelector('#password')?.value || '',
    }));
    filled = v.u === USER && v.p === PASS;
    if (!filled) log(`  fill attempt ${attempt} did not stick — retrying`);
  }
  if (!filled) throw new Error('login fields would not stay populated (form kept remounting)');

  // First login for a username surfaces an Alpha TOS checkbox; accept it so the
  // submit button enables. (Read-only consent UI, not data entry.)
  const tos = page.locator('input[type="checkbox"]');
  if (await tos.count() > 0 && await tos.first().isVisible().catch(() => false)) {
    await tos.first().check();
    await page.waitForTimeout(300);
    log('  accepted TOS checkbox (first login for this account)');
  }

  await page.click('button[type="submit"]');
  await page.waitForURL('**/w/dashboard**', { timeout: NAV_TIMEOUT });
  await settle(page);
  log('  login OK — landed on dashboard');
}

async function captureView(page, view) {
  log(`${view.name} → ${view.url}`);
  await page.goto(`${BASE_URL}${view.url}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

  if (view.waitFor) {
    const found = await page.waitForSelector(view.waitFor, { timeout: 20_000 }).catch(() => null);
    if (!found) log(`  WARN: waitFor selector "${view.waitFor}" not found — capturing anyway, review this image`);
  }
  await settle(page, view.extraSettleMs || 0);

  // Viewport shot
  await page.screenshot({ path: path.join(OUT_DIR, `${view.name}.png`) });

  // Below-the-fold companion
  if (view.belowFold) {
    if (view.fullPage) {
      await page.screenshot({ path: path.join(OUT_DIR, `${view.name}_b.png`), fullPage: true });
    } else {
      await page.evaluate(() => {
        const scroller = document.scrollingElement || document.documentElement;
        scroller.scrollBy(0, window.innerHeight);
        // Also scroll the tallest inner scroll container (grids/panels scroll internally)
        let tallest = null;
        for (const el of document.querySelectorAll('*')) {
          if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 300) {
            if (!tallest || el.scrollHeight > tallest.scrollHeight) tallest = el;
          }
        }
        if (tallest) tallest.scrollBy(0, tallest.clientHeight);
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, `${view.name}_b.png`) });
    }
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  log(`output → ${OUT_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    // Repo convention (playwright.config.ts): prefer system notarized Chrome on macOS.
    executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-crashpad', '--crash-dumps-dir=/tmp'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, // spec: 1440–1600px, no ultrawide
    deviceScaleFactor: 2,                   // retina-quality output
  });
  const page = await context.newPage();

  const failures = [];
  try {
    await login(page);
    for (const view of VIEWS) {
      try {
        await captureView(page, view);
      } catch (err) {
        failures.push({ view: view.name, error: String(err).slice(0, 200) });
        log(`  FAIL ${view.name}: ${err}`);
      }
    }
  } finally {
    await browser.close();
  }

  // Manifest + summary
  const files = fs.readdirSync(OUT_DIR).sort();
  const manifest = {
    session: 'LSCMD-CW-SCREENSHOTS-0610-ZK19',
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    projects: { land: LAND_PROJECT_ID, multifamily: MF_PROJECT_ID },
    expectedViews: VIEWS.map(v => v.name),
    files,
    failures,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  log(`done — ${files.length} files in ${OUT_DIR}`);
  const missing = VIEWS.filter(v => !files.includes(`${v.name}.png`)).map(v => v.name);
  if (missing.length) {
    log(`MISSING views: ${missing.join(', ')}`);
    process.exitCode = 1;
  }
  if (failures.length) {
    log(`FAILED views: ${failures.map(f => f.view).join(', ')}`);
    process.exitCode = 1;
  }
})();
