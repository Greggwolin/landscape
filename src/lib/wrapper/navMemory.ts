/**
 * Navigation memory for the chat-first project surface.
 * ---------------------------------------------------------------------------
 * Gregg's navigation rules, 2026-09-22 (chat MP, decisions D-2026-09-22-NAV-R1
 * through R12). This module is the one place that knows how the right panel's
 * state is written into the address and remembered per chat.
 *
 * THE MODEL
 *   The ADDRESS is the source of truth for what the project surface shows:
 *
 *     /w/projects/{id}?thread={uuid|new}&view={screen|artifacts|documents|map}
 *                     &folder=..&tab=..&artifact={id}&doctab=..
 *
 *   - Every change of chat and every change of what the panel shows is a new
 *     history entry, so the browser's Back and the in-app "← Back" retrace the
 *     same steps (Rule 8, answer 8e): panel states first, then the previous
 *     chat, in whatever project it lives.
 *   - A pasted link or a refresh restores the whole picture, not just the chat.
 *   - `thread=new` is a blank chat in the project (Rule 3). It becomes the real
 *     id, in place, the moment the first message creates the thread.
 *
 *   What is REMEMBERED (per browser, in localStorage):
 *   - for each chat, the panel it last had visible (Rule 2 — what was VISIBLE,
 *     not where work last landed);
 *   - for each project, its last active chat (Rule 1).
 *
 *   Memory is per browser. A chat opened on another machine for the first time
 *   falls back to the server-side "last productive" pointer, which is the
 *   nearest thing the server has.
 */

export type PanelView = 'screen' | 'artifacts' | 'documents' | 'map';

export interface PanelState {
  view?: PanelView;
  folder?: string;
  tab?: string;
  artifact?: number;
  /** Sub-tab of the Documents view (the classic screen has two). */
  doctab?: string;
}

/** Query-string keys owned by the panel. Everything else is left alone. */
export const PANEL_KEYS = ['view', 'folder', 'tab', 'artifact', 'doctab'] as const;

const VIEWS: readonly PanelView[] = ['screen', 'artifacts', 'documents', 'map'];

export const NEW_THREAD = 'new';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export function isThreadUuid(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

type ParamsLike = { get(key: string): string | null } | null | undefined;

/** Read the panel state from a query string. Missing keys stay undefined. */
export function parsePanelState(params: ParamsLike): PanelState {
  if (!params) return {};
  const s: PanelState = {};
  const view = params.get('view');
  if (view && (VIEWS as readonly string[]).includes(view)) s.view = view as PanelView;
  const folder = params.get('folder');
  if (folder) s.folder = folder;
  const tab = params.get('tab');
  if (tab) s.tab = tab;
  const doctab = params.get('doctab');
  if (doctab) s.doctab = doctab;
  const artifact = Number(params.get('artifact'));
  if (Number.isInteger(artifact) && artifact > 0) s.artifact = artifact;
  return s;
}

export function hasPanelState(s: PanelState): boolean {
  return s.view !== undefined;
}

/** Stable comparison of two panel states. */
export function samePanelState(a: PanelState, b: PanelState): boolean {
  return (
    (a.view ?? null) === (b.view ?? null) &&
    (a.folder ?? null) === (b.folder ?? null) &&
    (a.tab ?? null) === (b.tab ?? null) &&
    (a.artifact ?? null) === (b.artifact ?? null) &&
    (a.doctab ?? null) === (b.doctab ?? null)
  );
}

/**
 * Build a project-surface address. `thread` of undefined drops the chat
 * (the project's last chat is then looked up); pass NEW_THREAD for a blank one.
 */
export function buildProjectUrl(
  projectId: number | string,
  opts: { thread?: string | null; panel?: PanelState; extra?: Record<string, string> } = {},
): string {
  const qs = new URLSearchParams();
  if (opts.thread) qs.set('thread', opts.thread);
  const p = opts.panel ?? {};
  if (p.view) qs.set('view', p.view);
  if (p.folder) qs.set('folder', p.folder);
  if (p.tab) qs.set('tab', p.tab);
  if (p.doctab) qs.set('doctab', p.doctab);
  if (p.artifact) qs.set('artifact', String(p.artifact));
  if (opts.extra) for (const [k, v] of Object.entries(opts.extra)) qs.set(k, v);
  const q = qs.toString();
  return `/w/projects/${projectId}${q ? `?${q}` : ''}`;
}

// ── Remembered state ────────────────────────────────────────────────────────

const THREAD_KEY = (threadId: string) => `landscape.nav.thread.${threadId}`;
const PROJECT_KEY = (projectId: number | string) => `landscape.nav.projectLastThread.${projectId}`;

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — memory is a convenience, never load-bearing */
  }
}

/** The panel this chat last had visible (Rule 2), or null if never recorded. */
export function rememberedPanel(threadId: string | null | undefined): PanelState | null {
  if (!isThreadUuid(threadId)) return null;
  const s = readJson<PanelState>(THREAD_KEY(threadId));
  return s && s.view ? s : null;
}

export function rememberPanel(threadId: string | null | undefined, state: PanelState): void {
  if (!isThreadUuid(threadId) || !state.view) return;
  writeJson(THREAD_KEY(threadId), state);
}

/** The project's last active chat (Rule 1), or null on a first visit. */
export function rememberedProjectThread(projectId: number | string | null | undefined): string | null {
  if (projectId == null) return null;
  const t = readJson<string>(PROJECT_KEY(projectId));
  return isThreadUuid(t) ? t : null;
}

export function rememberProjectThread(projectId: number | string | null | undefined, threadId: string | null | undefined): void {
  if (projectId == null || !isThreadUuid(threadId)) return;
  writeJson(PROJECT_KEY(projectId), threadId);
}

/** Forget a project's last chat (e.g. it was archived or no longer exists). */
export function forgetProjectThread(projectId: number | string | null | undefined): void {
  if (projectId == null || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROJECT_KEY(projectId));
  } catch {
    /* ignore */
  }
}
