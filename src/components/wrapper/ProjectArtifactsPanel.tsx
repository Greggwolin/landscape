'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { MapArtifactRenderer } from './MapArtifactRenderer';
import { LocationBriefArtifact } from './LocationBriefArtifact';
import { ExcelAuditArtifact } from './ExcelAuditArtifact';
import { ArtifactWorkspacePanel } from './ArtifactWorkspacePanel';
import { WrapperHeader } from './WrapperHeader';

const DEFAULT_ARTIFACTS_WIDTH = 420;
const MIN_ARTIFACTS_WIDTH = 320;
const MAX_ARTIFACTS_WIDTH = 900;

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
  return (
    <>
      {/* Drag handle on LEFT edge — wider than before (was 4px, hard to
          target) and visible on hover so users can find it. */}
      <div
        className="wrapper-drag-handle"
        onPointerDown={handleResizeStart}
        title="Drag to resize artifact panel"
        style={{
          cursor: 'col-resize',
          width: 6,
          flexShrink: 0,
          background: 'var(--cui-border-color)',
          opacity: 0.5,
          transition: 'opacity 0.15s ease, background 0.15s ease',
        }}
        onPointerEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.opacity = '1';
          (e.currentTarget as HTMLDivElement).style.background = 'var(--cui-primary)';
        }}
        onPointerLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.opacity = '0.5';
          (e.currentTarget as HTMLDivElement).style.background = 'var(--cui-border-color)';
        }}
      />
      <div className="artifacts-panel" style={{ width: panelWidth, flexShrink: 0 }}>
      {/* Header */}
      <WrapperHeader
        title="Artifacts"
        trailing={
          <button
            className="w-btn w-btn-ghost w-btn-sm"
            onClick={toggleArtifacts}
            title="Collapse artifacts panel"
            style={{ fontSize: '14px', padding: '2px 6px' }}
          >
            ☰
          </button>
        }
      />

      {/* Body — artifact priority:
          generative artifact (Phase 3) > location brief > map > excel audit > workspace empty state.
          Generative artifact wins when explicitly selected. The legacy slots
          (location brief / map / excel audit) handle their own dedicated tools.
          The fallback is ALWAYS the ArtifactWorkspacePanel itself, which
          shows Pinned + Recent collapsibles plus a clean "no artifact selected"
          empty state — so closing an artifact never leaves the user stranded
          on a confusing surface (was: project documents list, fixed chat DA
          2026-05-01 after Gregg flagged it as disorienting). For documents,
          users navigate to the dedicated Documents page via the sidebar. */}
      {activeArtifactId != null ? (
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
    </>
  );
}
