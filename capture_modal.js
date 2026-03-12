const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'guide_screenshots');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Debug: find all buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('All buttons:', JSON.stringify(buttons.filter(b => b.trim())));

  // Also check for links that might be "new project"
  const links = await page.locator('a').allTextContents();
  console.log('All links:', JSON.stringify(links.filter(l => l.trim()).slice(0, 20)));

  // Try broader selectors
  const newBtn = await page.locator('button, a').filter({ hasText: /new|create|add/i }).allTextContents();
  console.log('New/Create/Add elements:', JSON.stringify(newBtn));

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
