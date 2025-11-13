// v1.0 — Switch config to system Chrome (safe) on Sonoma
const fs = require('fs');
const path = require('path');

const cfg = path.resolve('playwright.config.ts');
let text = fs.readFileSync(cfg, 'utf8');

text = text
  // Ensure executablePath is present
  .replace(/use:\s*\{[\s\S]*?\}/m, (m) => {
    if (!m.includes('executablePath')) {
      return m.replace('headless: true,', `headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    launchOptions: { args: ['--no-first-run','--no-default-browser-check','--crash-dumps-dir=/tmp','--disable-crashpad','--enable-crashpad=false'], env: { HOME: process.env.PLAYWRIGHT_FAKE_HOME || '/tmp/pw-playwright', CHROME_CRASH_REPORTER_DISABLE: '1' } },`);
    }
    return m;
  })
  // Comment out webkit/firefox projects
  .replace(/\/\/\s*\{ name: 'webkit'[\s\S]*?\},\s*/m, (m) => m)
  .replace(/\{ name: 'webkit'[\s\S]*?\},\s*/m, (m) => `// ${m}`)
  .replace(/\{ name: 'firefox'[\s\S]*?\},\s*/m, (m) => `// ${m}`);

fs.writeFileSync(cfg, text);
console.log('Switched to system Chrome. Run: npm run test:headless');
