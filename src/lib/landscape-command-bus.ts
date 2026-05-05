/**
 * Landscape Command Bus — chat-panel-to-UI command dispatch.
 *
 * Solves the structural problem that the chat panel lives in the outer
 * `/w/` layout shell, while UI surfaces it needs to drive (modal registry,
 * project context, etc.) live in child layouts mounted below it. React
 * context flows down the tree, so the chat panel can't reach providers
 * mounted lower in the tree via context.
 *
 * The bus inverts the dependency: any subscriber anywhere in the tree
 * registers a handler for a command type, and any emitter (chat panel,
 * other components) fires commands without needing to know who's listening.
 *
 * # Usage
 *
 * Emitter side (e.g., chat panel):
 *
 *   import { emitLandscapeCommand } from '@/lib/landscape-command-bus';
 *   emitLandscapeCommand('open_modal', { modal_name: 'project_details' });
 *
 * Subscriber side (e.g., a small component mounted inside the modal provider):
 *
 *   import { useLandscapeCommand } from '@/lib/landscape-command-bus';
 *   useLandscapeCommand('open_modal', (payload) => {
 *     modalRegistry.openModal(payload.modal_name, payload.context);
 *   });
 *
 * # Design notes
 *
 * - Module-level state, not React context. Subscribers register through a
 *   useEffect-managed hook that adds and removes themselves on mount/unmount.
 *   No provider needed at the root; the bus is "always available."
 * - Typed payloads via the LandscapeCommandPayloadMap below — each new
 *   command type adds one entry there and the emit/subscribe APIs pick up
 *   the type automatically.
 * - Multiple subscribers per command are supported (Set, not single-handler).
 *   First subscriber wins for race-y commands like open_modal because the
 *   handlers are called in registration order; in practice we expect one
 *   subscriber per command per route.
 * - No-op when no subscriber is registered — that's the correct behavior on
 *   routes where the command's effect surface isn't mounted (e.g., emitting
 *   open_modal on /w/chat where no project context exists).
 *
 * # Adding a new command type
 *
 * 1. Add an entry to LandscapeCommandPayloadMap below with the payload shape.
 * 2. (Subscriber side) call useLandscapeCommand with the new command name in
 *    whatever component should handle it.
 * 3. (Emitter side) call emitLandscapeCommand with the new command name.
 *
 * No changes needed to the bus internals — type inference handles the rest.
 */

import { useEffect } from 'react';

// ─── Command type registry ────────────────────────────────────────────────
//
// Each entry maps a command name to its payload shape. The emit and subscribe
// APIs are typed against this map.

export interface LandscapeCommandPayloadMap {
  /**
   * Open a registered modal in the user's interface.
   *
   * Subscriber: a small bridge component mounted inside the
   * ModalRegistryProvider's tree (currently
   * /w/projects/[projectId]/layout.tsx). The bridge calls
   * modalRegistry.openModal(modal_name, context).
   *
   * Backed by the open_input_modal Landscaper tool. The chat panel's
   * tool-result handler emits this command when the tool returns
   * { action: 'open_modal', modal_name, context }.
   */
  open_modal: {
    modal_name: string;
    context?: Record<string, unknown>;
  };
}

export type LandscapeCommand = keyof LandscapeCommandPayloadMap;

export type LandscapeCommandHandler<C extends LandscapeCommand> = (
  payload: LandscapeCommandPayloadMap[C],
) => void;

// ─── Bus internals ────────────────────────────────────────────────────────

const listeners = new Map<LandscapeCommand, Set<LandscapeCommandHandler<any>>>();

/**
 * Emit a command. Calls every registered handler for the command in
 * registration order. Handler exceptions are caught and logged so one
 * misbehaving subscriber doesn't break the dispatch chain.
 *
 * Returns the number of handlers invoked (useful for diagnostics —
 * e.g., emit returns 0 when no subscriber is mounted, indicating the
 * command silently no-opped).
 */
export function emitLandscapeCommand<C extends LandscapeCommand>(
  command: C,
  payload: LandscapeCommandPayloadMap[C],
): number {
  const handlers = listeners.get(command);
  if (!handlers || handlers.size === 0) {
    if (typeof window !== 'undefined' && (window as any).__LANDSCAPE_BUS_DEBUG__) {
      console.warn(
        `[LandscapeCommandBus] emit(${command}) has no subscribers; command no-opped.`,
        payload,
      );
    }
    return 0;
  }
  let invoked = 0;
  for (const handler of handlers) {
    try {
      handler(payload);
      invoked += 1;
    } catch (err) {
      console.error(
        `[LandscapeCommandBus] handler for "${command}" threw:`,
        err,
      );
    }
  }
  return invoked;
}

/**
 * Subscribe to a command from a React component. The handler is registered
 * on mount and removed on unmount. The handler reference is captured per-
 * effect-run, so callers should memoize handlers (useCallback) if they
 * close over state that should NOT trigger resubscription.
 */
export function useLandscapeCommand<C extends LandscapeCommand>(
  command: C,
  handler: LandscapeCommandHandler<C>,
): void {
  useEffect(() => {
    let set = listeners.get(command);
    if (!set) {
      set = new Set();
      listeners.set(command, set);
    }
    set.add(handler);
    return () => {
      const current = listeners.get(command);
      if (current) {
        current.delete(handler);
        if (current.size === 0) {
          listeners.delete(command);
        }
      }
    };
  }, [command, handler]);
}

/**
 * For tests and diagnostics — clear all subscribers. Production code should
 * not call this; subscribers manage their own lifecycle via the hook.
 */
export function _clearLandscapeCommandBus(): void {
  listeners.clear();
}
