// v1.0 · 2025-11-09 · Contrast probe for dark header
import { test } from '@playwright/test';

// Update this selector to whatever the test targets (header, navbar, etc.)
const HEADER_SEL = 'header, .app-header, [data-testid="app-header"]';

function relLuminance(rgb: [number, number, number]) {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb.map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseRGB(s: string): [number, number, number] {
  // Accept rgb() or rgba()
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) throw new Error(`Unparsable color: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number];
}

test('print computed header colors + contrast', async ({ page }) => {
  await page.goto(process.env.APP_URL ?? 'http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    // Force dark mode if your app toggles via data-theme
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForSelector(HEADER_SEL, { state: 'visible' });

  const info = await page.$eval(HEADER_SEL, (el) => {
    const cs = getComputedStyle(el as HTMLElement);
    const bg =
      cs.backgroundColor ||
      (el.parentElement ? getComputedStyle(el.parentElement).backgroundColor : 'rgb(0,0,0)');
    const fg = cs.color;
    const vars = Array.from((el as HTMLElement).ownerDocument!.styleSheets)
      .filter((s) =>
        Boolean((s as CSSStyleSheet).ownerNode) && ((s as CSSStyleSheet).cssRules?.length ?? 0) > 0,
      )
      .slice(0, 20)
      .map((s) => (s as CSSStyleSheet).href || '[inline]');
    return {
      selector:
        (el as HTMLElement).tagName +
        ((el as HTMLElement).id ? `#${(el as HTMLElement).id}` : '') +
        ((el as HTMLElement).className
          ? `.${((el as HTMLElement).className as string).trim().replace(/\s+/g, '.')}`
          : ''),
      color: fg,
      backgroundColor: bg,
      fontWeight: cs.fontWeight,
      cssVarsRoot: getComputedStyle(document.documentElement),
      styleSheets: vars,
    };
  });

  const fg = parseRGB(info.color);
  const bg = parseRGB(info.backgroundColor);
  const L1 = relLuminance(fg);
  const L2 = relLuminance(bg);
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

  console.log(
    JSON.stringify(
      {
        headerSelector: info.selector,
        color: info.color,
        backgroundColor: info.backgroundColor,
        contrastRatio: Number(ratio.toFixed(2)),
        AA_text: ratio >= 4.5,
        AA_ui: ratio >= 3.0,
      },
      null,
      2,
    ),
  );

  // Do not fail: this probe is diagnostic only
});
