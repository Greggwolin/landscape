'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { UI_MODE_COOKIE, DEFAULT_UI_MODE, type UiMode } from '@/lib/uiMode';

/** Match a project base route in either shell and capture the project id. */
const PROJECT_ROUTE = /^\/(?:w\/)?projects\/(\d+)/;

interface UiModeSwitchProps {
  /** When the sidebar is collapsed, render a single compact control. */
  collapsed?: boolean;
  /** Most-recently-used project id. Used when Classic is chosen from a
   *  project-less screen (home/dashboard) so it can open that project in the
   *  classic shell — classic has no standalone home. */
  recentProjectId?: number | string | null;
}

/**
 * Always-visible Chat / Classic selector for the chat-first sidebar.
 *
 * Chat is the home for everyone; this switch records which shell PROJECTS open
 * in (the `ui_mode` cookie that middleware reads), and acts immediately when a
 * project is open:
 *   - In a project  → full-navigates that project to the chosen shell.
 *   - Not in a project → sets the preference; choosing Classic routes to the
 *     projects list so the user can open one (which then lands in classic via
 *     middleware). There is no standalone classic home screen by design.
 *
 * Full navigation (window.location) is intentional so middleware re-evaluates
 * routing with the new cookie value without a redirect bounce — same approach
 * as ClassicViewToggle.
 */
export function UiModeSwitch({ collapsed = false, recentProjectId }: UiModeSwitchProps) {
  const pathname = usePathname() || '';
  const [mode, setMode] = React.useState<UiMode>(DEFAULT_UI_MODE);

  // Read the persisted preference on mount (client-only to avoid hydration mismatch).
  React.useEffect(() => {
    const m = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${UI_MODE_COOKIE}=`))
      ?.split('=')[1];
    if (m === 'classic' || m === 'unified') setMode(m);
  }, []);

  const select = (target: UiMode) => {
    if (target === mode) return;
    setMode(target);

    const projectMatch = pathname.match(PROJECT_ROUTE);
    let destination: string;
    if (projectMatch) {
      const id = projectMatch[1];
      destination = target === 'classic' ? `/projects/${id}` : `/w/projects/${id}`;
    } else if (target === 'classic') {
      // No project open and classic has no home: open the most-recent project in
      // the classic shell so one click lands the user on real classic content.
      // Fall back to the projects picker if there's no recent project.
      destination = recentProjectId ? `/projects/${recentProjectId}` : '/w/projects';
    } else {
      destination = '/w/dashboard';
    }
    // Server-authoritative: navigate with ?setui=<mode> so middleware sets the
    // ui_mode cookie on the redirect and bounces to the clean URL — same fix as
    // ClassicViewToggle (#105). The old document.cookie write raced the nav.
    window.location.assign(`${destination}?setui=${target}`);
  };

  if (collapsed) {
    // Compact: one button that flips to the other mode.
    const other: UiMode = mode === 'classic' ? 'unified' : 'classic';
    return (
      <div className="sb-uimode sb-uimode--collapsed">
        <button
          type="button"
          className="ui-mode-chip"
          onClick={() => select(other)}
          title={mode === 'classic' ? 'Classic view — switch to Chat' : 'Chat view — switch to Classic'}
          style={chipStyle(true)}
        >
          {mode === 'classic' ? 'C' : '○'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="sb-uimode"
      role="group"
      aria-label="View mode"
      style={{
        display: 'flex',
        gap: 2,
        padding: 3,
        margin: '0 8px 8px',
        borderRadius: 8,
        background: 'var(--w-surface-2, rgba(255,255,255,0.06))',
        border: '1px solid var(--w-border, rgba(255,255,255,0.12))',
      }}
    >
      <button
        type="button"
        onClick={() => select('unified')}
        aria-pressed={mode === 'unified'}
        style={segStyle(mode === 'unified')}
        title="Chat-first view"
      >
        Chat
      </button>
      <button
        type="button"
        onClick={() => select('classic')}
        aria-pressed={mode === 'classic'}
        style={segStyle(mode === 'classic')}
        title="Classic tabbed view"
      >
        Classic
      </button>
    </div>
  );
}

function segStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '5px 8px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 500,
    background: active ? 'var(--w-accent, #6366f1)' : 'transparent',
    color: active ? '#fff' : 'var(--w-text-secondary, #9ca3af)',
    transition: 'background 0.12s ease',
  };
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid var(--w-border, rgba(255,255,255,0.12))',
    background: 'var(--w-surface-2, rgba(255,255,255,0.06))',
    color: 'var(--w-text-secondary, #9ca3af)',
    cursor: 'pointer',
    fontSize: '0.8rem',
  };
}

export default UiModeSwitch;
