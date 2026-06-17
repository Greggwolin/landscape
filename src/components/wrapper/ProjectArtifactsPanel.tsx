'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { MapArtifactRenderer } from './MapArtifactRenderer';
import { LocationBriefArtifact } from './LocationBriefArtifact';
import { ExcelAuditArtifact } from './ExcelAuditArtifact';
import { ArtifactWorkspacePanel } from './ArtifactWorkspacePanel';
import { WrapperHeader } from './WrapperHeader';
import { ProjectDocumentsBody } from './ProjectDocumentsBody';
import { ClassicViewToggle } from '@/components/ui/ClassicViewToggle';

const DEFAULT_ARTIFACTS_WIDTH = 420;
const MIN_ARTIFACTS_WIDTH = 320;
const MAX_ARTIFACTS_WIDTH = 1600;

// Left sidebar collapses to this width during artifact takeover. Mirrors
// COLLAPSED_WIDTH in src/app/w/layout.tsx — when activeArtifactId becomes
// truthy, layout.tsx auto-collapses the sidebar to 48px, so we use that
// same number to compute the 50/50 split for chat + artifact.
const SIDEBAR_COLLAPSED_WIDTH = 48;

interface ProjectArtifactsPanelProps {
  projectId: number;
  /** Override the "Project Documents" section label. Used by the home-page
   *  dashboard which mounts this panel against the user's home project; the
   *  label there is just "Documents" since there's no real project context. */
  documentsLabel?: string;
  /** Include unassigned (project_id=null) artifacts alongside project-scoped
   *  ones. Transitional flag for the home page — until Phase 3 attaches
   *  dashboard chats to the home project, their artifacts are unassigned. */
  includeUnassigned?: boolean;
  /** Show the "Classic view" toggle in the header. Only true on the real
   *  project view (/w/projects/[id]); the dashboard mount leaves it off so the
   *  toggle doesn't appear in a no-real-project context. */
  showViewToggle?: boolean;
}

export function ProjectArtifactsPanel({ projectId, documentsLabel, includeUnassigned, showViewToggle }: ProjectArtifactsPanelProps) {
  const {
    artifactsOpen,
    toggleArtifacts,
    activeMapArtifact,
    activeLocationBrief,
    activeExcelAudit,
    activeArtifactId,
    projectRightPanelView,
    setProjectRightPanelView,
  } = useWrapperUI();

  // Draggable width (LEFT-edge handle, dragging left widens the panel)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_ARTIFACTS_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Takeover mode — when activeArtifactId becomes truthy, expand the panel
  // to share the remaining viewport with the chat (50/50 after the
  // collapsed sidebar). On close (X clicked → activeArtifactId nulled),
  // restore the pre-takeover width. layout.tsx handles the sidebar
  // collapse + restore in parallel. RP-CFRPT-2605 Phase 3 follow-up.
  const preTakeoverWidth = useRef<number | null>(null);
  const inTakeoverMode = useRef(false);
  const takeoverMode = activeArtifactId != null;

  useEffect(() => {
    if (takeoverMode && !inTakeoverMode.current) {
      preTakeoverWidth.current = panelWidth;
      inTakeoverMode.current = true;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
      const available = Math.max(vw - SIDEBAR_COLLAPSED_WIDTH, MIN_ARTIFACTS_WIDTH * 2);
      const half = Math.round(available / 2);
      setPanelWidth(Math.min(Math.max(half, MIN_ARTIFACTS_WIDTH), MAX_ARTIFACTS_WIDTH));
    } else if (!takeoverMode && inTakeoverMode.current) {
      setPanelWidth(preTakeoverWidth.current ?? DEFAULT_ARTIFACTS_WIDTH);
      preTakeoverWidth.current = null;
      inTakeoverMode.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeoverMode]);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = panelWidth;

      const handleMove = (ev: PointerEvent) => {
        if (!isResizing.current) return;
        const delta = startX.current - ev.clientX;
        const newWidth = startWidth.current + delta;
        setPanelWidth(
          Math.min(Math.max(newWidth, MIN_ARTIFACTS_WIDTH), MAX_ARTIFACTS_WIDTH)
        );
      };

      const handleUp = () => {
        isResizing.current = false;
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [panelWidth]
  );

  /* ── Collapsed strip ── */
  if (!artifactsOpen) {
    return (
      <div className="artifacts-collapsed">
        <button
          className="artifacts-expand-btn"
          onClick={toggleArtifacts}
          title="Open artifacts panel"
        >
          ☰
        </button>
      </div>
    );
  }

  /* ── Expanded panel ── */
  // The parent <main class="wrapper-main wrapper-main-narrow"> is
  // flex-direction: column, which would stack the drag handle ABOVE the
  // panel as a zero-height horizontal strip (it has explicit width: 6 but
  // no height). Wrap the handle + panel in a row-direction container so
  // the handle sits to the LEFT of the panel as designed, regardless of
  // the parent's flex direction.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        // alignSelf: flex-start prevents the column-flex parent from
        // stretching this wrapper to fill the cross-axis (width). Content
        // sizing then comes from the row-flex children (handle + panel),
        // so <main> can resize as panelWidth changes.
        alignSelf: 'flex-start',
        width: 'max-content',
      }}
    >
      <div
        className="wrapper-drag-handle"
        onPointerDown={handleResizeStart}
        style={{
          cursor: 'col-resize',
          width: 4,
          flexShrink: 0,
          background: 'transparent',
        }}
      />
      <div className="artifacts-panel" style={{ width: panelWidth, flexShrink: 0 }}>
      {/* Header — Artifacts | Documents view toggle. Sits at the top of
          the rail full-bleed (no gutter). Active label is white, inactive
          is muted. Clicking either swaps the panel body without navigating
          away or losing the active chat thread. Persists across project
          sub-routes via WrapperUIContext. */}
      <WrapperHeader
        title={
          <div className="project-right-panel-toggle">
            <button
              type="button"
              className={`prp-toggle-btn${projectRightPanelView === 'artifacts' ? ' is-active' : ''}`}
              onClick={() => setProjectRightPanelView('artifacts')}
            >
              Artifacts
            </button>
            <span className="prp-toggle-sep" aria-hidden>|</span>
            <button
              type="button"
              className={`prp-toggle-btn${projectRightPanelView === 'documents' ? ' is-active' : ''}`}
              onClick={() => setProjectRightPanelView('documents')}
            >
              Documents
            </button>
          </div>
        }
        trailing={
          <>
            {showViewToggle && (
              <ClassicViewToggle
                projectId={projectId}
                current="unified"
                className="w-btn w-btn-ghost w-btn-sm"
                style={{ fontSize: '12px', padding: '2px 8px' }}
              />
            )}
            <button
              className="w-btn w-btn-ghost w-btn-sm"
              onClick={toggleArtifacts}
              title="Collapse panel"
              style={{ fontSize: '14px', padding: '2px 6px' }}
            >
              ☰
            </button>
          </>
        }
      />

      {/* Body — padded rail gutter that hosts cards. View dispatch:
          - Documents view: full-bleed DMS surface (no card wrap; the
            DMS owns the entire body and has its own internal layout).
          - Artifacts view with active full-artifact (LocationBrief / Map
            / ExcelAudit): the artifact fills the body in a single
            flex-grow card.
          - Default artifacts view: ArtifactWorkspacePanel renders its
            own per-section card stack inside .artifacts-panel-body. */}
      {projectRightPanelView === 'documents' ? (
        <div className="project-right-panel-body project-right-panel-body--documents">
          <ProjectDocumentsBody />
        </div>
      ) : activeArtifactId != null ? (
        <ArtifactWorkspacePanel projectId={projectId} documentsLabel={documentsLabel} includeUnassigned={includeUnassigned} takeoverMode />
      ) : activeLocationBrief ? (
        <LocationBriefArtifact
          config={activeLocationBrief}
          onClose={toggleArtifacts}
        />
      ) : activeMapArtifact ? (
        <MapArtifactRenderer
          config={activeMapArtifact}
          onClose={toggleArtifacts}
        />
      ) : activeExcelAudit ? (
        <ExcelAuditArtifact
          config={activeExcelAudit}
          onClose={toggleArtifacts}
        />
      ) : (
        <ArtifactWorkspacePanel projectId={projectId} documentsLabel={documentsLabel} includeUnassigned={includeUnassigned} />
      )}
      </div>
    </div>
  );
}
