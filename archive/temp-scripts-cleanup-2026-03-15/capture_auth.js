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

  // Navigate and check what we get
  const resp = await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Status:', resp.status(), 'URL:', page.url());

  // Try to find login form and fill it
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passInput = page.locator('input[type="password"]').first();

  if (await emailInput.count() > 0 && await passInput.count() > 0) {
    console.log('Login form found, trying credentials...');
    // Try common dev credentials
    await emailInput.fill('admin@landscape.dev');
    await passInput.fill('admin123');
    
    const signInBtn = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
    if (await signInBtn.count() > 0) {
      await signInBtn.click();
      await page.waitForTimeout(5000);
      console.log('After login URL:', page.url());
      console.log('Title:', await page.title());
      
      // Check if we're past login
      const hasPassword = await page.locator('input[type="password"]').count();
      if (hasPassword === 0) {
        console.log('Login succeeded!');
        
        // Take dashboard screenshot
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(OUT, '01_dashboard.png'), fullPage: false });
        console.log('-> 01_dashboard.png (authenticated)');
        
        // Find new project button
        const allBtns = await page.locator('button').allTextContents();
        console.log('Buttons after login:', JSON.stringify(allBtns.filter(b => b.trim())));
        
        // Try to click new project
        const newBtn = page.locator('button, a').filter({ hasText: /new|create|add project/i }).first();
        if (await newBtn.count() > 0) {
          const txt = await newBtn.textContent();
          console.log('Found new project button:', txt);
          await newBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: path.join(OUT, '02_create_project.png'), fullPage: false });
          console.log('-> 02_create_project.png');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
        
        // Project workspace
        await page.goto('http://localhost:3000/projects/17', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(OUT, '03_project_workspace.png'), fullPage: false });
        console.log('-> 03_project_workspace.png');
        
        // Documents tab
        await page.goto('http://localhost:3000/projects/17?folder=documents', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(OUT, '04_documents_tab.png'), fullPage: false });
        console.log('-> 04_documents_tab.png');
        
      } else {
        console.log('Login may have failed, still seeing password field');
        await page.screenshot({ path: path.join(OUT, 'debug_after_login.png'), fullPage: false });
      }
    }
  } else {
    console.log('No standard login form found');
    // Maybe already past auth?
    await page.screenshot({ path: path.join(OUT, 'debug_landing.png'), fullPage: false });
  }

  // Summary
  console.log('\n--- Files ---');
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  for (const f of files) {
    const sz = fs.statSync(path.join(OUT, f)).size;
    console.log(`  ${f} (${(sz/1024).toFixed(0)} KB)`);
  }

  await browser.close();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
