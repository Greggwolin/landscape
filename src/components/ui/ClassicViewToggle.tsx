'use client';

import React from 'react';
import { UI_MODE_COOKIE, type UiMode } from '@/lib/uiMode';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

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
 * and the chat-first shell (/w/projects/[id]).
 *
 * Sets the `ui_mode` cookie, then does a FULL navigation (not a client-side
 * router push) so middleware re-evaluates routing with the new cookie value and
 * lands on the correct shell without a redirect bounce.
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
    document.cookie =
      `${UI_MODE_COOKIE}=${target}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    window.location.assign(destination);
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
