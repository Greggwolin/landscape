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
 * and the Studio shell (/studio/[id]).
 *
 * The chat destination has been /studio/[id] since #135 made Studio THE project
 * shell; this comment said /w/projects/[id] until 2026-09-14, which is what a
 * reader checked it against while diagnosing Gregg's report that "Chat view"
 * lands on the classic home page. It does — but not because the route is wrong.
 * Studio's right panel opens on ProjectContentRouter (the classic screen tree)
 * whenever there is no active artifact, so arriving from this button puts the
 * classic project home in the panel. See D-2026-09-14-Q4.
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
    target === 'classic' ? `/projects/${projectId}` : `/studio/${projectId}`;

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
