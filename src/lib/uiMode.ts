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

export type UiMode = 'unified' | 'classic';

/** Behavior is unchanged for anyone who never opts in. */
export const DEFAULT_UI_MODE: UiMode = 'unified';
