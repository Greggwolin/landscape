const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Dump all input elements
  const inputs = await page.locator('input').evaluateAll(els =>
    els.map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      className: el.className.substring(0, 80),
    }))
  );
  console.log('Inputs:', JSON.stringify(inputs, null, 2));

  // Dump all buttons/links
  const btns = await page.locator('button, a[role="button"], input[type="submit"]').evaluateAll(els =>
    els.map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 50),
      type: el.type,
    }))
  );
  console.log('Buttons:', JSON.stringify(btns, null, 2));

  // Check for NextAuth / custom auth
  const html = await page.content();
  const hasNextAuth = html.includes('next-auth') || html.includes('NextAuth');
  const hasCredentials = html.includes('credentials') || html.includes('csrfToken');
  console.log('NextAuth:', hasNextAuth, 'Credentials:', hasCredentials);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
