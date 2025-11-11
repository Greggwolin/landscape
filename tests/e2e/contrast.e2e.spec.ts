import { test, expect, Page } from '@playwright/test';
import { contrastRatio } from '../../src/test-utils/contrast';

const ROUTES = ['/dashboard', '/budget-grid'];
const MIN_CONTRAST = 4.5;

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((mode) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-coreui-theme', mode);
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${mode}-theme`);
  }, theme);
}

function rgbStringToHex(input: string) {
  const match = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    throw new Error(`Unexpected RGB format: ${input}`);
  }
  const [, r, g, b] = match;
  const toHex = (value: string) => Number(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function assertHeaderContrast(page: Page, theme: 'light' | 'dark') {
  await setTheme(page, theme);
  // Allow styles to update.
  await page.waitForTimeout(100);

  const header = page.locator('header').first();
  await expect(header).toBeVisible();

  const { color, backgroundColor } = await header.evaluate((el) => {
    const styles = getComputedStyle(el);
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
    };
  });

  const textHex = rgbStringToHex(color);
  const bgHex = rgbStringToHex(backgroundColor);
  const ratio = contrastRatio(textHex, bgHex);
  expect(ratio, `Expected ${theme} header contrast to be >= ${MIN_CONTRAST}, got ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
}

for (const route of ROUTES) {
  test.describe(`Header contrast on ${route}`, () => {
    test(`meets WCAG AA in light and dark themes`, async ({ page }) => {
      const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
      await page.goto(new URL(route, baseUrl).toString());
      await assertHeaderContrast(page, 'light');
      await assertHeaderContrast(page, 'dark');
    });
  });
}
