/**
 * AppraisalChatPanel
 *
 * Center panel wrapping LandscaperChatThreaded — the full Landscaper UI
 * with header (branding, approach pill, +, notifications), thread list
 * (new/edit/delete), and conversation.
 *
 * Always mounted as a child of .appraisal-body. In summary mode it renders
 * as a normal flex column (center of the three-panel row). In detail mode
 * it repositions via CSS to an absolutely-positioned docked strip at the
 * bottom of the detail content area — keeping the same React instance so
 * threads, draft input, scroll position, and messages persist across the
 * summary ↔ detail toggle.
 *
 * Uses LandscaperChatThreaded (NOT LandscaperChat) because the threaded
 * version has built-in thread management matching the existing app.
 *
 * @version 2.0
 * @created 2026-04-04
 * @updated 2026-04-08 — Always-mounted dual-mode (center / docked) with
 *                       in-panel height resize + collapse for docked mode
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import type { ApproachId } from './appraisal.types';
import { APPROACH_LABELS } from './appraisal.config';
import { LandscaperChatThreaded } from '@/components/landscaper/LandscaperChatThreaded';

interface AppraisalChatPanelProps {
  projectId: number;
  activeApproach: ApproachId;
  detailMode: boolean;
  leftWidth: number;
  dockedChatHeight: number;
  dockedChatCollapsed: boolean;
  onDockedChatHeightChange: (h: number) => void;
  onDockedChatToggle: () => void;
}

export function AppraisalChatPanel({
  projectId,
  activeApproach,
  detailMode,
  leftWidth,
  dockedChatHeight,
  dockedChatCollapsed,
  onDockedChatHeightChange,
  onDockedChatToggle,
}: AppraisalChatPanelProps) {
  const contextLabel = APPROACH_LABELS[activeApproach] || 'General';

  // Docked height resize — drag handle at top of panel (detail mode only)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return;
      const diff = dragRef.current.startY - e.clientY;
      const next = Math.max(48, Math.min(500, dragRef.current.startHeight + diff));
      onDockedChatHeightChange(next);
    },
    [onDockedChatHeightChange]
  );

  const onUp = useCallback(() => {
    dragRef.current = null;
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }, [onMove]);

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startY: e.clientY, startHeight: dockedChatHeight };
      document.body.classList.add('resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [dockedChatHeight, onMove, onUp]
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('resizing');
    };
  }, [onMove, onUp]);

  // Class + inline style switch by mode
  const className = [
    'appraisal-center',
    detailMode && 'docked',
    detailMode && dockedChatCollapsed && 'collapsed',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = detailMode
    ? {
        left: leftWidth,
        height: dockedChatCollapsed ? 48 : dockedChatHeight,
      }
    : {};

  return (
    <div className={className} style={style}>
      {detailMode && (
        <>
          <div
            className="appraisal-chat-dock-resize"
            onMouseDown={onDown}
            title="Drag to resize"
          >
            <div className="appraisal-chat-dock-resize-bar" />
          </div>
          <button
            type="button"
            className="appraisal-chat-dock-toggle"
            onClick={onDockedChatToggle}
            title={dockedChatCollapsed ? 'Expand' : 'Collapse'}
          >
            {dockedChatCollapsed ? '▲' : '▼'}
          </button>
        </>
      )}
      <LandscaperChatThreaded
        projectId={projectId}
        pageContext={activeApproach}
        contextPillLabel={contextLabel}
        isExpanded={true}
      />
    </div>
  );
}
