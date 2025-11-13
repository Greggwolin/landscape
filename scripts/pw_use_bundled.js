// v1.0 — Switch config back to bundled browsers (use with caution)
const fs = require('fs');
const path = require('path');

const cfg = path.resolve('playwright.config.ts');
let text = fs.readFileSync(cfg, 'utf8');

// Remove executablePath block
text = text.replace(/executablePath:\s*['"].+?['"],?\s*\n?\s*launchOptions:\s*\{[\s\S]*?\},?/m, '');

// Uncomment webkit/firefox projects if commented
text = text.replace(/\/\/\s*(\{ name: 'webkit'[\s\S]*?\},?)/m, '$1');
text = text.replace(/\/\/\s*(\{ name: 'firefox'[\s\S]*?\},?)/m, '$1');

fs.writeFileSync(cfg, text);
console.log('Switched to bundled Playwright browsers. If headless fails on Sonoma, run: npm run pw:use-system');
