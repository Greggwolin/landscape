const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = '/Users/5150east/landscape/guide_screenshots';
const BASE_URL = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // Login
  console.log('1. Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.locator('input[type="checkbox"]').click();
  await page.waitForTimeout(500);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  console.log(`  After login: ${page.url()}`);

  // Navigate explicitly to /dashboard
  console.log('2. Navigating to /dashboard...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log(`  On: ${page.url()}`);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01_dashboard.png'),
    fullPage: false,
  });
  console.log('  Saved: 01_dashboard.png');

  // Also try /projects as fallback
  console.log('3. Trying /projects...');
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(`  On: ${page.url()}`);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01_dashboard_alt.png'),
    fullPage: false,
  });
  console.log('  Saved: 01_dashboard_alt.png');

  await browser.close();
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
