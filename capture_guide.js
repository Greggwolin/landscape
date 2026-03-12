/**
 * Screenshot capture for Getting Started Guide
 * Runs on host machine via Desktop Commander (localhost:3000 reachable)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'guide_screenshots');
const BASE = 'http://localhost:3000';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // 1. Dashboard / Projects list
  console.log('1. Dashboard...');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '01_dashboard.png'), fullPage: false });
  console.log('  -> 01_dashboard.png');

  // 2. Click "+ New Project" to get create modal
  console.log('2. Create Project modal...');
  try {
    const btn = page.locator('button:has-text("New"), a:has-text("New Project"), [data-testid="new-project"]').first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT, '02_create_project.png'), fullPage: false });
      console.log('  -> 02_create_project.png');
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('  No New Project button found, skipping');
    }
  } catch (e) {
    console.log('  Create modal failed:', e.message);
  }

  // 3. Open a project workspace (try project 17 = Peoria Lakes)
  console.log('3. Project workspace...');
  try {
    await page.goto(`${BASE}/projects/17`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, '03_project_workspace.png'), fullPage: false });
    console.log('  -> 03_project_workspace.png');
  } catch (e) {
    console.log('  Workspace failed:', e.message);
  }

  // 4. Documents tab
  console.log('4. Documents tab...');
  try {
    await page.goto(`${BASE}/projects/17?folder=documents`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, '04_documents_tab.png'), fullPage: false });
    console.log('  -> 04_documents_tab.png');
  } catch (e) {
    console.log('  Documents tab failed:', e.message);
  }

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
