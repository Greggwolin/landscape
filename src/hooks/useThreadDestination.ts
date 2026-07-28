'use client';

/**
 * Read / write the "where was this chat last productive" pointer.
 * LSCMD-THREADDEST-0728-TA.
 *
 * Two halves, deliberately kept in one file because they must agree:
 *   - `recordDestination` — fire-and-forget write, called from the live tool
 *     result path once a turn produces something restorable.
 *   - `useThreadRestore`  — reads the pointer when the active thread CHANGES
 *     and hands it back for restoration, exactly once per thread.
 *
 * The once-per-thread guard is the important part. Restoration must not fight
 * the live path: while the user is chatting in a thread, handleToolResult is
 * already opening panels as results arrive. Re-restoring on top of that would
 * yank the panel back to an older destination mid-conversation.
 */

import { useEffect, useRef, useState } from 'react';
import {
  destinationFromPageContext,
  isThreadDestination,
  type ThreadDestination,
} from '@/lib/landscaper/threadDestination';

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch {
    /* ignore — unauthenticated callers simply get a 401 and no-op */
  }
  return {};
}

/**
 * Persist where this thread was last productive. Fire-and-forget by design.
 *
 * This runs on the hot path of every productive chat turn, immediately after
 * the panel has already been opened locally. The user has their result on
 * screen; a failed write costs them a correct reopen later, not the thing they
 * just asked for. So a failure here must never surface as an error, and must
 * never block. Silence is the correct behaviour.
 */
export async function recordDestination(
  threadId: string,
  destination: ThreadDestination,
): Promise<void> {
  if (!threadId) return;
  try {
    await fetch(
      `${DJANGO_API_URL}/api/landscaper/threads/${threadId}/destination/`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(destination),
      },
    );
  } catch {
    /* see docstring — deliberately swallowed */
  }
}

/**
 * Fetch the destination for a thread, or null.
 * Exported separately so tests and non-React callers can use it.
 *
 * Falls back to the thread's `pageContext` when no destination has been
 * recorded. That covers threads created before this feature existed: measured
 * 2026-07-28, 61 of 565 carry a context that names a real screen — including
 * the map thread that prompted the work. The other 504 fall through to null
 * and their reopen correctly leaves the screen alone.
 */
export async function fetchDestination(
  threadId: string,
  signal?: AbortSignal,
): Promise<ThreadDestination | null> {
  const res = await fetch(
    `${DJANGO_API_URL}/api/landscaper/threads/${threadId}/destination/`,
    { headers: authHeaders(), signal },
  );
  if (!res.ok) return null;
  const data = await res.json();

  const raw = data?.destination;
  if (isThreadDestination(raw)) return raw;

  return destinationFromPageContext(data?.pageContext, data?.projectId);
}

/**
 * Emit a destination once, when `threadId` changes to a thread we have not
 * already restored in this mount.
 *
 * Returns the destination to act on, plus `clear()` for the consumer to call
 * after acting. The consumer performs the restoration rather than this hook,
 * because opening an artifact and pushing a route are the panel's concerns,
 * not a data hook's.
 *
 * Threads with no destination (the common case — roughly nine in ten) resolve
 * to null and the caller leaves the screen alone. That is the designed
 * outcome, not a miss.
 */
export function useThreadRestore(threadId: string | null | undefined): {
  pending: ThreadDestination | null;
  clear: () => void;
} {
  const [pending, setPending] = useState<ThreadDestination | null>(null);

  // Threads already restored during this mount. A Set, not a single "last id",
  // so that toggling back and forth between two threads does not re-fire the
  // first one — the user has since moved the panel themselves and we would be
  // overriding a deliberate choice.
  const restoredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!threadId) return;
    if (restoredRef.current.has(threadId)) return;

    const controller = new AbortController();
    let active = true;

    fetchDestination(threadId, controller.signal)
      .then((dest) => {
        // Drop the result of any superseded run. Under React StrictMode the
        // effect fires setup → cleanup → setup on mount; the first run is
        // aborted here (active=false) and only the surviving run delivers. If
        // we instead marked the thread restored BEFORE the fetch resolved, the
        // second setup would early-return and the aborted first fetch would be
        // the only one — so the map (or artifact) never came back on reopen in
        // dev. Mark restored on DELIVERY, not on dispatch, so exactly one run
        // per (mount, thread) restores and a genuine remount can retry.
        if (!active) return;
        restoredRef.current.add(threadId);
        if (dest) setPending(dest);
      })
      .catch(() => {
        /* aborted, absent, or unreachable → leave the screen alone */
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [threadId]);

  return {
    pending,
    clear: () => setPending(null),
  };
}
