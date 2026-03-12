const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'guide_screenshots');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // Login
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  console.log('Post-login URL:', page.url());

  const stillLogin = await page.locator('#password').count();
  if (stillLogin > 0) {
    console.log('Login failed, trying other creds...');
    await page.fill('#username', 'gregg');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    console.log('Post-login URL:', page.url());
  }

  // 1. Dashboard
  console.log('1. Dashboard...');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '01_dashboard.png'), fullPage: false });
  console.log('  -> 01_dashboard.png');

  // Check what buttons exist now
  const btns = await page.locator('button, a').filter({ hasText: /new|create|add/i }).allTextContents();
  console.log('  New/Create buttons:', JSON.stringify(btns));

  // 2. New Project modal
  console.log('2. Create Project...');
  const newBtn = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New")').first();
  if (await newBtn.count() > 0) {
    await newBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '02_create_project.png'), fullPage: false });
    console.log('  -> 02_create_project.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('  No create button found');
  }

  // 3. Project workspace (Peoria Lakes)
  console.log('3. Project workspace...');
  await page.goto('http://localhost:3000/projects/17', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '03_project_workspace.png'), fullPage: false });
  console.log('  -> 03_project_workspace.png');

  // 4. Documents tab
  console.log('4. Documents tab...');
  await page.goto('http://localhost:3000/projects/17?folder=documents', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '04_documents_tab.png'), fullPage: false });
  console.log('  -> 04_documents_tab.png');

  // Summary
  console.log('\n--- Results ---');
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  for (const f of files) {
    const sz = fs.statSync(path.join(OUT, f)).size;
    console.log(`  ${f} (${(sz/1024).toFixed(0)} KB)`);
  }
  await browser.close();
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
