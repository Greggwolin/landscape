'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { MapArtifactRenderer } from './MapArtifactRenderer';
import { LocationBriefArtifact } from './LocationBriefArtifact';
import { ExcelAuditArtifact } from './ExcelAuditArtifact';
import { ArtifactWorkspacePanel } from './ArtifactWorkspacePanel';
import { WrapperHeader } from './WrapperHeader';
import { ProjectDocumentsBody } from './ProjectDocumentsBody';

const DEFAULT_ARTIFACTS_WIDTH = 420;
const MIN_ARTIFACTS_WIDTH = 320;
const MAX_ARTIFACTS_WIDTH = 1600;

interface ProjectArtifactsPanelProps {
  projectId: number;
}

export function ProjectArtifactsPanel({ projectId }: ProjectArtifactsPanelProps) {
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
      {/* Floating card — the panel itself is now the rail (padding +
          sidebar bg shows through as the gutter). The card holds header
          + body and inherits the rounded corners via overflow:hidden. */}
      <div className="w-rail-card">
      {/* Header — Artifacts | Documents view toggle.
          Active label is white, inactive is muted. Clicking either swaps
          the panel body without navigating away or losing the active chat
          thread. Persists across project sub-routes via WrapperUIContext. */}
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
          <button
            className="w-btn w-btn-ghost w-btn-sm"
            onClick={toggleArtifacts}
            title="Collapse panel"
            style={{ fontSize: '14px', padding: '2px 6px' }}
          >
            ☰
          </button>
        }
      />

      {/* Body — view dispatch.
          Documents view: panel-sized DMS surface (DocumentsPanel + MediaPanel).
          Artifacts view: priority chain — generative artifact (Phase 3) >
          location brief > map > excel audit > workspace empty state.
          Generative artifact wins when explicitly selected. The legacy slots
          (location brief / map / excel audit) handle their own dedicated
          tools. The fallback is the ArtifactWorkspacePanel itself, which
          shows Pinned + Recent collapsibles plus a clean "no artifact
          selected" empty state. */}
      {projectRightPanelView === 'documents' ? (
        <div className="project-right-panel-body project-right-panel-body--documents">
          <ProjectDocumentsBody />
        </div>
      ) : activeArtifactId != null ? (
        <ArtifactWorkspacePanel projectId={projectId} />
      ) : activeLocationBrief ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LocationBriefArtifact
            config={activeLocationBrief}
            onClose={toggleArtifacts}
          />
        </div>
      ) : activeMapArtifact ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MapArtifactRenderer
            config={activeMapArtifact}
            onClose={toggleArtifacts}
          />
        </div>
      ) : activeExcelAudit ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ExcelAuditArtifact
            config={activeExcelAudit}
            onClose={toggleArtifacts}
          />
        </div>
      ) : (
        <ArtifactWorkspacePanel projectId={projectId} />
      )}
      </div>
      </div>
    </div>
  );
}
