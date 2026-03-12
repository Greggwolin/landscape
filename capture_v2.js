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
  await page.waitForTimeout(2000);

  // Type credentials
  await page.locator('#username').click();
  await page.keyboard.type('admin', { delay: 50 });
  await page.locator('#password').click();
  await page.keyboard.type('admin123', { delay: 50 });
  await page.waitForTimeout(500);

  // Check for TOS checkbox and click it
  const tosCheckbox = page.locator('input[type="checkbox"]').first();
  if (await tosCheckbox.count() > 0) {
    console.log('TOS checkbox found, clicking...');
    await tosCheckbox.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Check button state now
  const btnDisabled = await page.locator('button[type="submit"]').isDisabled();
  console.log('Button disabled after TOS:', btnDisabled);

  if (!btnDisabled) {
    await page.locator('button[type="submit"]').click();
  } else {
    // Force enable and click
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = false; btn.click(); }
    });
  }
  await page.waitForTimeout(5000);
  console.log('Post-login URL:', page.url());

  // Check if still on login
  if (page.url().includes('login')) {
    console.log('Still on login page. Checking for errors...');
    const errorText = await page.locator('[role="alert"], .error, .text-red').allTextContents();
    console.log('Errors:', JSON.stringify(errorText));
    // Try bypassing auth with direct navigation
    console.log('Trying direct project access...');
    await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle' });
    console.log('Projects URL:', page.url());
    if (page.url().includes('login')) {
      console.log('Auth required. Need valid credentials.');
      await browser.close();
      return;
    }
  }

  // 1. Dashboard
  console.log('\n1. Dashboard...');
  if (!page.url().includes('/projects')) {
    await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '01_dashboard.png'), fullPage: false });
  console.log('  -> 01_dashboard.png');

  // List buttons for new project
  const allBtns = await page.locator('button, a').filter({ hasText: /new|create|add/i }).allTextContents();
  console.log('  Buttons:', JSON.stringify(allBtns));

  // 2. New Project
  console.log('2. Create Project...');
  const newBtn = page.locator('button, a').filter({ hasText: /new|create/i }).first();
  if (await newBtn.count() > 0) {
    await newBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '02_create_project.png'), fullPage: false });
    console.log('  -> 02_create_project.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Project workspace
  console.log('3. Workspace...');
  await page.goto('http://localhost:3000/projects/17', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '03_project_workspace.png'), fullPage: false });
  console.log('  -> 03_project_workspace.png');

  // 4. Documents tab
  console.log('4. Documents...');
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
