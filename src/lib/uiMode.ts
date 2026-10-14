/**
 * UI-mode preference shared between middleware (server) and the toggle (client).
 *
 * `unified`  → chat-first /w/ shell (default for everyone with no preference set)
 * `classic`  → legacy ARGUS-style tabbed /projects/[id] shell
 *
 * The value lives in the `ui_mode` cookie so middleware can read it server-side
 * and gate the /projects ⇄ /w/projects redirect without a client-side flash.
 */
export const UI_MODE_COOKIE = 'ui_mode';

export type UiMode = 'unified' | 'classic' | 'design';

/**
 * `design` → the Slice 1 reference look (2026-10-14). The whole app is reachable
 * in it: platform pages stay on their /w/ routes but render in the design skin,
 * and every project opens in the design shell (/design/[id]). Middleware does
 * the project redirects; the /w/ layout adds the skin class.
 */
export function readUiModeCookie(): UiMode | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${UI_MODE_COOKIE}=`))
    ?.split('=')[1];
  return m === 'classic' || m === 'unified' || m === 'design' ? m : null;
}

/** Behavior is unchanged for anyone who never opts in. */
export const DEFAULT_UI_MODE: UiMode = 'unified';
