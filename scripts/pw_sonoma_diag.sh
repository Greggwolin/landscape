#!/usr/bin/env bash
set -euo pipefail

CACHE="$HOME/Library/Caches/ms-playwright"
echo "== Playwright macOS Sonoma diagnostic =="
sw_vers
echo
echo "Playwright cache: $CACHE"
[ -d "$CACHE" ] && find "$CACHE" -maxdepth 2 -type f -name 'chrome' -o -name 'Chromium.app' -o -name 'WebKit*' -o -name 'firefox' | sed 's/^/  /' || echo "  (no cached browsers found)"

echo
echo "== Quarantine/xattr checks =="
if [ -d "$CACHE" ]; then
  /usr/bin/xattr -lr "$CACHE" 2>/dev/null | sed 's/^/  /' || true
else
  echo "  (skip; no cache)"
fi

echo
echo "== Codesign checks (system Chrome + cached Chromium if present) =="
/usr/bin/codesign -dv --verbose=4 "/Applications/Google Chrome.app" 2>&1 | sed 's/^/  /'
echo
if [ -d "$CACHE" ]; then
  CHR=$(find "$CACHE" -type d -name "chrome-mac" -maxdepth 2 2>/dev/null | head -n1)
  if [ -n "${CHR:-}" ] && [ -d "$CHR/Chromium.app" ]; then
    /usr/bin/codesign -dv --verbose=4 "$CHR/Chromium.app" 2>&1 | sed 's/^/  /' || true
  else
    echo "  (no cached Chromium.app found)"
  fi
fi

echo
echo "== Launch headless probe with system Chrome =="
node -e "const { chromium } = require('@playwright/test'); (async () => { const home = process.env.PLAYWRIGHT_FAKE_HOME || '/tmp/pw-playwright'; const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--crash-dumps-dir=/tmp','--disable-crashpad','--enable-crashpad=false'], env: { HOME: home, CHROME_CRASH_REPORTER_DISABLE: '1' } }); const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto('data:text/html,ok'); console.log('  Headless probe ok'); await browser.close(); })().catch(e => { console.error(e); process.exit(1); });"
