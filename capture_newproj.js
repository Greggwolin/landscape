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
  console.log('Logged in:', page.url());

  // Go to dashboard and look for ALL interactive elements
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Dump all buttons and links
  const allInteractive = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')];
    return els.map(e => ({
      tag: e.tagName,
      text: e.textContent.trim().substring(0, 60),
      href: e.href || '',
      cls: e.className.substring(0, 60),
    })).filter(e => e.text);
  });
  console.log('Interactive elements:');
  allInteractive.forEach(e => console.log(`  ${e.tag}: "${e.text}" ${e.href ? '-> ' + e.href : ''}`));

  // Try projects page instead
  await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('\nProjects page URL:', page.url());

  const projBtns = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')];
    return els.map(e => ({
      tag: e.tagName,
      text: e.textContent.trim().substring(0, 60),
    })).filter(e => e.text);
  });
  console.log('Projects page buttons:');
  projBtns.forEach(e => console.log(`  ${e.tag}: "${e.text}"`));

  // Try clicking anything with "new" or "+" or "create"
  const createBtn = page.locator('button, a, [role="button"]').filter({ hasText: /new|create|\+/i }).first();
  if (await createBtn.count() > 0) {
    const txt = await createBtn.textContent();
    console.log('\nFound create button:', txt.trim());
    await createBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '02_create_project.png'), fullPage: false });
    console.log('-> 02_create_project.png');
  } else {
    console.log('\nNo create button found on projects page');
    // Take projects list screenshot as alternative
    await page.screenshot({ path: path.join(OUT, '02_projects_list.png'), fullPage: false });
    console.log('-> 02_projects_list.png (project list instead)');
  }

  await browser.close();
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
