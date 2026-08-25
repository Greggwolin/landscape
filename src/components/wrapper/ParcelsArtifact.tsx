'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import type { PlanningViewState } from '@/app/components/Planning/PlanningContent';

/**
 * The Parcels workspace, hosted in the artifacts panel.
 *
 * WHY THIS COMPONENT IS FOUR LINES OF SUBSTANCE
 * ---------------------------------------------
 * Because the screen is not being rebuilt. Gregg's instruction was *"the
 * functionality of this modal is what needs to be converted into an
 * artifact(s)"* — the functionality is right, the container was not. So this
 * mounts the same `PlanningContent` the overlay mounts, and everything the
 * screen does it keeps doing: the container tiles, the phase list, the parcel
 * table, the cascading land-use pickers, adding and deleting.
 *
 * Anything more here would be a second implementation of a screen that works,
 * which is precisely the mistake the reverted land-plan build made.
 *
 * WHAT CHANGES BY BEING HERE
 * --------------------------
 * The overlay holds one value, throws the screen away on close, and has no list
 * anywhere — so there is nothing to hang a reopen on, and the only way back was
 * to leave the conversation and come back. As an artifact it is a saved row: it
 * lists under Recent, reopens on one click, and stays put.
 *
 * WHAT SURVIVES A CLOSE (decision 2a)
 * -----------------------------------
 * Which filters are applied and which sections are open. They ride on the
 * artifact record, so closing and reopening puts you back where you were
 * instead of at the top of an unfiltered table.
 *
 * NOT an in-progress row edit, and NOT a half-typed new parcel. Both are
 * deliberate: an unagreed change that reappears an hour later is worse than
 * one that was lost, and the person who typed it has no way to tell which of
 * the two happened.
 *
 * The write is debounced and fire-and-forget. A dropped view save costs a
 * scroll position, so it must never interrupt the screen or surface an error
 * over the work.
 *
 * HEIGHT, NOT LAYOUT
 * ------------------
 * The screen needs a bounded height and nothing else; it was built for a wide
 * surface and the panel is a column, so it will be tight until the panel is
 * widened. That is a styling pass, not a wiring problem — every service it
 * depends on is already in scope here (verified: it uses SWR and
 * useProjectConfig, neither of which needs a provider this panel lacks).
 */

// Loaded on demand, and never on the server: the screen reads localStorage for
// auth headers on mount. Same treatment the overlay gives it.
const ParcelsTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/ParcelsTab'),
  { ssr: false },
);

export interface ParcelsArtifactConfig {
  project_id: number;
  surface?: string;
  project_name?: string;
  level_labels?: { level1?: string; level2?: string; level3?: string };
}

interface Props {
  config: ParcelsArtifactConfig;
  onClose?: () => void;
  /** Where the view was left last time. Absent on a new record, which is
   *  right — a fresh workspace opens unfiltered.
   *
   *  Deliberately a SIBLING of `config`, not a field inside it. The record's
   *  settings object is shallow-merged on every re-ask, with the tool's values
   *  winning on each top-level key — so anything nested inside `parcels_config`
   *  would be wiped the next time someone asked for the parcel table. Kept
   *  alongside, it survives, exactly as the report toolbar's saved view does. */
  viewState?: PlanningViewState | null;
  /** Persists the view onto the artifact record. Absent → the workspace still
   *  works, it just forgets, which is what it did before 2a. */
  onViewStateChange?: (state: PlanningViewState) => void;
}

/** How long to sit on a change before writing it.
 *
 *  Clicking through four filters is one intent, not four. Long enough to
 *  collapse a burst, short enough that closing the panel straight after a
 *  click still saves — the flush on unmount below covers the rest. */
const VIEW_SAVE_DEBOUNCE_MS = 600;

export function ParcelsArtifact({ config, onClose, viewState, onViewStateChange }: Props) {
  const projectId = Number(config?.project_id);

  // The saver is held in a ref so the screen never re-renders because the panel
  // handed us a new arrow function, and so the debounce timer below survives a
  // parent re-render mid-burst.
  const saveRef = React.useRef(onViewStateChange);
  saveRef.current = onViewStateChange;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<PlanningViewState | null>(null);

  const flush = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending && saveRef.current) saveRef.current(pending);
  }, []);

  // Closing the panel is the single most likely moment to lose a change, since
  // it usually follows the last click by well under the debounce. Flushing on
  // unmount is what makes "come back to the view you left" actually true.
  React.useEffect(() => flush, [flush]);

  const handleViewStateChange = React.useCallback(
    (state: PlanningViewState) => {
      pendingRef.current = state;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, VIEW_SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  if (!Number.isFinite(projectId)) {
    // A record with no project cannot mount the screen. Say so rather than
    // rendering an empty frame that reads as a broken table.
    return (
      <div style={{ padding: 16, fontSize: 13 }}>
        This workspace is not attached to a project, so the parcels cannot be
        loaded. Ask for the parcel table again from inside a project.
      </div>
    );
  }

  const noun = config?.level_labels?.level3 || 'Parcel';
  const plural = noun.endsWith('s') ? noun : `${noun}s`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--cui-border-color)',
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--cui-secondary-color)',
            }}
          >
            {config?.project_name || 'Project'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{plural}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              border: 0,
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--cui-secondary-color)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* The screen, given room and left alone. `minHeight: 0` is what lets it
        * scroll inside the panel instead of pushing the panel taller — the
        * overlay achieves the same thing with a fixed viewport calculation,
        * which would be wrong here because the panel is resizable. */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ParcelsTab
          project={{ project_id: projectId, project_name: config?.project_name || '', project_type_code: 'LAND' }}
          initialViewState={viewState ?? null}
          onViewStateChange={onViewStateChange ? handleViewStateChange : undefined}
        />
      </div>
    </div>
  );
}
