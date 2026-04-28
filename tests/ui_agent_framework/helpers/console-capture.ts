// Console + network capture helper. Wraps a Playwright Page with listeners
// that record all errors/warnings/4xx-5xx responses. Exposes `getCriticalErrors()`
// for use in S-UI-8 (the wrapper that fails any test producing critical errors).
//
// The "critical" filter targets the specific bug shapes today's session surfaced:
// - "Cannot update a component while rendering" (finding #7, the render-phase
//   setState bug)
// - "Unhandled promise rejection"
// - 401 after fresh login (finding #13)
// - React key warnings + missing-deps hook warnings (general hygiene)
//
// Non-critical noise (e.g. third-party warnings, font load 404s) is captured
// but not failed on.

import type { Page, ConsoleMessage, Response } from '@playwright/test';

export interface CapturedConsoleEntry {
  type: 'log' | 'info' | 'warning' | 'error' | 'pageerror';
  text: string;
  location?: string;
  timestamp: number;
}

export interface CapturedNetworkEntry {
  url: string;
  status: number;
  method: string;
  timestamp: number;
}

export interface ConsoleCapture {
  entries: CapturedConsoleEntry[];
  network: CapturedNetworkEntry[];
  getCriticalErrors: () => CapturedConsoleEntry[];
  getAuthErrors: () => CapturedNetworkEntry[];
  /** Reset captured arrays. Call between phases of a test if needed. */
  reset: () => void;
}

const CRITICAL_PATTERNS = [
  /Cannot update a component .*while rendering a different component/i,
  /Unhandled promise rejection/i,
  /Each child in a list should have a unique "key" prop/i,
  /React Hook .* has a missing dependency/i,
  /React Hook .* has an unnecessary dependency/i,
];

const IGNORE_PATTERNS = [
  // CoreUI styled-components hydration warnings — known noisy, not actionable here
  /Warning: Prop `[a-zA-Z]+` did not match/i,
  // Dev-mode HMR chatter
  /\[HMR\]|\[Fast Refresh\]/,
  // Anthropic SDK occasional info logs
  /Anthropic-Beta/i,
];

export function captureConsole(page: Page): ConsoleCapture {
  const entries: CapturedConsoleEntry[] = [];
  const network: CapturedNetworkEntry[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning' && type !== 'log' && type !== 'info') return;
    const loc = msg.location();
    entries.push({
      type: type as CapturedConsoleEntry['type'],
      text: msg.text(),
      location: loc?.url ? `${loc.url}:${loc.lineNumber}` : undefined,
      timestamp: Date.now(),
    });
  };

  const onPageError = (err: Error) => {
    entries.push({
      type: 'pageerror',
      text: err.message + (err.stack ? `\n${err.stack}` : ''),
      timestamp: Date.now(),
    });
  };

  const onResponse = (res: Response) => {
    const status = res.status();
    if (status >= 400) {
      network.push({
        url: res.url(),
        status,
        method: res.request().method(),
        timestamp: Date.now(),
      });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  const getCriticalErrors = (): CapturedConsoleEntry[] => {
    return entries.filter((e) => {
      if (IGNORE_PATTERNS.some((p) => p.test(e.text))) return false;
      if (e.type === 'pageerror') return true;
      if (e.type === 'error' && CRITICAL_PATTERNS.some((p) => p.test(e.text))) return true;
      if (e.type === 'warning' && CRITICAL_PATTERNS.some((p) => p.test(e.text))) return true;
      return false;
    });
  };

  // 401s after fresh login (finding #13). Also flag any 5xx since those
  // are server-side regressions worth surfacing.
  const getAuthErrors = (): CapturedNetworkEntry[] => {
    return network.filter((n) => n.status === 401 || n.status >= 500);
  };

  return {
    entries,
    network,
    getCriticalErrors,
    getAuthErrors,
    reset: () => {
      entries.length = 0;
      network.length = 0;
    },
  };
}
