/**
 * Thread destination — "where was this chat last productive?"
 * ---------------------------------------------------------------------------
 * LSCMD-THREADDEST-0728-TA. Design note:
 *   "Landscape app/Reopening-a-Chat-Where-It-Left-Off-2026-07-28.html"
 *
 * THE PROBLEM
 *   Everything visual a chat produces is delivered live, inside
 *   CenterChatPanel.handleToolResult, at the instant the tool result streams
 *   in. Reopening a thread later replays the transcript and nothing else, so
 *   the user lands on a blank stage — the reported case was a chat that set a
 *   site-plan overlay to 30% opacity from the map, reopened onto no map.
 *
 * THE MODEL
 *   One pointer per thread, written on tool OUTPUT, last-productive-turn-wins,
 *   read exactly once when the thread is reopened. Not a replay log.
 *
 *   Two kinds, and the distinction is the whole design:
 *     - 'artifact' — the chat MADE something durable. Put it back on screen.
 *     - 'screen'   — the chat was WORKING somewhere (and may have changed
 *                    project state that is already saved). Go back there.
 *
 *   A third category exists and deliberately has no destination: chats that
 *   CHANGED something. The change is already persisted in the project — the
 *   overlay really is at 30% right now. Re-applying on reopen would be a bug,
 *   not a restoration. So a change contributes only its screen, never a replay.
 *
 * WHY NOT REUSE `pageContext`
 *   It already exists on every thread and is useless for this. It records
 *   where the user was standing when they started typing, not where the work
 *   landed. Measured against production 2026-07-28: 504 of 565 threads carry
 *   'home' / 'general' / 'projects' / 'dashboard'. 176 say 'home' purely
 *   because handleStartChat hardcodes it for chats begun from the project
 *   homepage. One thread titled about the budget is stamped 'admin'.
 *   pageContext survives here only as a last-resort fallback (see
 *   `destinationFromPageContext`), never as the primary signal.
 *
 * INVARIANTS — these are the ones worth protecting in review:
 *   1. Deriving a destination NEVER has side effects. Pure function of
 *      (toolName, result).
 *   2. Restoring NEVER re-runs a tool and NEVER re-applies a change.
 *   3. A destination that cannot be acted on is never written. Returning null
 *      (reopen leaves the screen alone) is the correct outcome for ~9 threads
 *      in 10 and must not be treated as a failure.
 */

/** Where a thread was last productive. Tagged union, persisted as JSONB. */
export type ThreadDestination =
  | {
      kind: 'artifact';
      /** tbl_artifact.artifact_id — the thing to put back on screen. */
      artifactId: number;
      /** Tool that produced it. Diagnostic only; never dispatched on. */
      tool: string;
      /** Optional display label for a future "resume" affordance. */
      label?: string;
      /** ISO timestamp of the productive turn. */
      at: string;
    }
  | {
      kind: 'screen';
      /** Route to return to, e.g. '/w/projects/9/map'. */
      route?: string;
      /** Short screen key for labelling, e.g. 'map'. */
      screen?: string;
      /** Studio in-place navigation target. */
      folder?: string;
      tab?: string;
      tool: string;
      label?: string;
      at: string;
    };

/**
 * Tools whose results represent a change to live project state rather than a
 * thing that was made. These contribute a SCREEN destination so the user can
 * get back to where the change is visible — never an artifact, and never a
 * replay. The change itself is already saved server-side.
 */
const STATE_CHANGE_MAP_TOOLS = new Set([
  'control_map_overlay',
  'extract_plan_image',
]);

/** Narrow an unknown to a positive integer id. */
function asArtifactId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * Derive the destination a tool result implies, or null if it implies none.
 *
 * Mirrors the branch order of CenterChatPanel.handleToolResult on purpose: the
 * live path and the restore path must agree about what a result means, and the
 * cheapest way to keep them agreeing is to keep them readable side by side.
 *
 * @param toolName  the tool that ran
 * @param result    its result envelope
 * @param projectId the active project, used to build map routes
 * @param now       injectable clock, for deterministic tests
 */
export function deriveDestination(
  toolName: string,
  result: Record<string, unknown>,
  projectId?: number | string | null,
  now: () => string = () => new Date().toISOString(),
): ThreadDestination | null {
  const at = now();

  // ---- Artifact destinations ------------------------------------------------
  // Ordered most-specific first. open_clarification nests its artifact inside
  // an envelope, so the generic top-level check below never sees it — the same
  // reason handleToolResult carries a dedicated branch for it.
  if (toolName === 'open_clarification' && result.artifact_created && result.artifact) {
    const nested = result.artifact as { artifact_id?: unknown };
    const id = asArtifactId(nested.artifact_id);
    if (id) {
      return { kind: 'artifact', artifactId: id, tool: toolName, at };
    }
  }

  // generate_location_brief and generate_map_artifact both register a real
  // artifact row in addition to their bespoke panel config, so both restore
  // through the ordinary artifact path.
  const topLevelId = asArtifactId(result.artifact_id);
  if (topLevelId) {
    return {
      kind: 'artifact',
      artifactId: topLevelId,
      tool: toolName,
      label: asString(result.title),
      at,
    };
  }

  if (result.action === 'show_artifact') {
    // show_artifact without a usable id cannot be restored. Fall through
    // rather than writing a pointer that would dead-end on reopen.
    const id = asArtifactId(result.artifact_id);
    if (id) return { kind: 'artifact', artifactId: id, tool: toolName, at };
  }

  // ---- Screen destinations --------------------------------------------------
  // Live map work. The overlay change is already persisted server-side; all we
  // owe the user on reopen is the map itself.
  if (STATE_CHANGE_MAP_TOOLS.has(toolName)) {
    const route =
      asString(result.navigate_to) ??
      (projectId ? `/w/projects/${projectId}/map` : undefined);
    if (route) {
      return { kind: 'screen', route, screen: 'map', tool: toolName, at };
    }
  }

  // Explicit in-place studio navigation.
  if (result.action === 'navigate_screen') {
    const folder = asString(result.folder);
    if (folder) {
      return {
        kind: 'screen',
        folder,
        tab: asString(result.tab),
        screen: folder,
        tool: toolName,
        at,
      };
    }
  }

  // Explicit route navigation.
  if (result.action === 'navigate') {
    const route = asString(result.target_url);
    if (route) {
      return { kind: 'screen', route, screen: screenKeyFromRoute(route), tool: toolName, at };
    }
  }

  // NOTE — deliberately absent:
  //
  //   open_input_modal   Decision 4a / §4 of the design note: reopening a chat
  //                      returns you to the screen, it does not re-open a form
  //                      uninvited. The modal's underlying screen is already
  //                      captured by whatever navigation preceded it.
  //
  //   show_excel_audit   The audit panel is assembled in React state across
  //                      five separate tool calls and was never persisted, so
  //                      there is nothing to point at. It is lost on plain
  //                      browser refresh today, independent of this feature.
  //                      Decision 3a is to promote it to a real artifact; once
  //                      that lands it restores through the artifact path above
  //                      with no change here. Tracked as slice 2.
  return null;
}

/** Best-effort short label for a route, for display only. */
export function screenKeyFromRoute(route: string): string | undefined {
  const known = ['map', 'documents', 'reports', 'tools', 'admin', 'budget'];
  return known.find((k) => route.includes(`/${k}`));
}

/**
 * Last-resort fallback for threads that predate destination recording, or that
 * navigated somewhere without producing anything.
 *
 * Returns null for the four values that name no screen. This is why the
 * fallback is nearly free and nearly useless: it fires for 61 of 565 existing
 * threads and no-ops for the rest. It is here because those 61 include the
 * originally reported map case, so it makes the fix retroactive for exactly
 * the situation that prompted it.
 */
export function destinationFromPageContext(
  pageContext: string | null | undefined,
  projectId?: number | string | null,
  now: () => string = () => new Date().toISOString(),
): ThreadDestination | null {
  if (!pageContext || !projectId) return null;

  // Values that record "where the user happened to be", not a screen.
  const UNINFORMATIVE = new Set(['home', 'general', 'projects', 'dashboard']);
  if (UNINFORMATIVE.has(pageContext)) return null;

  // Only contexts that map to a real /w/ route are worth returning to. An
  // unrecognised context is treated as uninformative rather than guessed at —
  // sending someone to a 404 is worse than leaving their screen alone.
  const ROUTABLE: Record<string, string> = {
    map: 'map',
    documents: 'documents',
    reports: 'reports',
    tools: 'tools',
  };
  const segment = ROUTABLE[pageContext];
  if (!segment) return null;

  return {
    kind: 'screen',
    route: `/w/projects/${projectId}/${segment}`,
    screen: pageContext,
    tool: 'page_context_fallback',
    at: now(),
  };
}

/** Type guard for values coming back off the wire. */
export function isThreadDestination(value: unknown): value is ThreadDestination {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (d.kind === 'artifact') return asArtifactId(d.artifactId) !== null;
  if (d.kind === 'screen') return Boolean(asString(d.route) || asString(d.folder));
  return false;
}
