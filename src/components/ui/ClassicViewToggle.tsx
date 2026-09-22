'use client';

import React from 'react';
import { type UiMode } from '@/lib/uiMode';

interface ClassicViewToggleProps {
  /** Project the toggle should switch views for. */
  projectId: number | string;
  /** Which shell is currently rendering the toggle. */
  current: UiMode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Switches the active project between the classic tabbed shell (/projects/[id])
 * and the chat-first project view (/w/projects/[id]).
 *
 * HISTORY, because this was wrong for three months. #135 (June) made Studio THE
 * project shell and pointed the chat destination at /studio/[id]. PR #181
 * (2026-07-19) reverted that funnel — /w/ became the working project surface —
 * and nobody re-pointed this button, so "Chat view" kept landing users in the
 * studio. Gregg reported it 2026-09-18; the 2026-09-14 Q4 diagnosis had read the
 * symptom (studio's right panel opens on the classic screen tree, so it LOOKS
 * like classic) without catching that the destination itself was stale.
 * Studio remains reachable by direct URL; nothing routes to it automatically.
 *
 * Does a FULL navigation (not a client-side router push) to the destination
 * with `?setui=<mode>`. Middleware sets the `ui_mode` cookie server-side on the
 * redirect response and bounces to the clean URL, so the new mode is reliably
 * present on the next request — no client cookie-write / navigation race.
 *
 * Rendered in both shell headers:
 *  - legacy ActiveProjectBar  → current="classic", label "Chat view"
 *  - chat-first WrapperHeader  → current="unified", label "Classic view"
 */
export function ClassicViewToggle({
  projectId,
  current,
  className,
  style,
}: ClassicViewToggleProps) {
  const target: UiMode = current === 'classic' ? 'unified' : 'classic';
  const label = current === 'classic' ? 'Chat view' : 'Classic view';
  const destination =
    target === 'classic' ? `/projects/${projectId}` : `/w/projects/${projectId}`;

  const handleClick = () => {
    // Server-authoritative: navigating with ?setui=<mode> lets middleware set
    // the ui_mode cookie on the redirect response, guaranteeing it is present on
    // the next request (the old client document.cookie write raced with the
    // navigation and middleware read a stale mode → bounced back to chat).
    window.location.assign(`${destination}?setui=${target}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
      title={
        current === 'classic'
          ? 'Switch to the chat-first view'
          : 'Switch to the classic tabbed view'
      }
    >
      {label}
    </button>
  );
}
