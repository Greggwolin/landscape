const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Try typing slowly to trigger React state
  await page.locator('#username').click();
  await page.keyboard.type('admin', { delay: 50 });
  await page.locator('#password').click();
  await page.keyboard.type('admin123', { delay: 50 });
  await page.waitForTimeout(1000);

  // Check button state
  const btnDisabled = await page.locator('button[type="submit"]').isDisabled();
  console.log('Button disabled after typing:', btnDisabled);

  // Try force click
  if (btnDisabled) {
    console.log('Force clicking...');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(5000);
    console.log('After force click URL:', page.url());
  } else {
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);
    console.log('After click URL:', page.url());
  }

  // Check page source for validation hints
  const src = await page.content();
  const loginSection = src.substring(src.indexOf('username'), src.indexOf('username') + 500);
  console.log('Login HTML snippet:', loginSection.substring(0, 300));

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
