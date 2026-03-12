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

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('#username').click();
  await page.keyboard.type('admin', { delay: 30 });
  await page.locator('#password').click();
  await page.keyboard.type('admin123', { delay: 30 });
  const tos = page.locator('input[type="checkbox"]').first();
  if (await tos.count() > 0) await tos.click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);

  // Dashboard - click "+ New Project"
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const newBtn = page.locator('button:has-text("+ New Project")');
  console.log('Button count:', await newBtn.count());
  if (await newBtn.count() > 0) {
    await newBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '02_create_project.png'), fullPage: false });
    console.log('-> 02_create_project.png');
    const sz = fs.statSync(path.join(OUT, '02_create_project.png')).size;
    console.log(`  Size: ${(sz/1024).toFixed(0)} KB`);
  }

  await browser.close();
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
