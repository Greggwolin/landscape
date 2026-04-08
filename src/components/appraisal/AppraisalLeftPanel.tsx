/**
 * AppraisalLeftPanel
 *
 * Left sidebar matching the v4 portable Landscaper prototype:
 *   - Top actions: Desktop / + New job / + New conversation / Search
 *   - Agents (with running/idle status badges)
 *   - Client (firm + appraiser stacked)
 *   - Jobs (with chevron + colored dots)
 *   - Threads — Income (per-thread items + dates)
 *
 * Static placeholder content. CoreUI icons throughout.
 *
 * @version 2.0
 * @created 2026-04-04
 * @updated 2026-04-07 — Restructured to match prototype (Jobs/Client/Agents/Threads sections)
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilLaptop,
  cilPlus,
  cilSearch,
  cilCommentSquare,
  cilSpeedometer,
  cilBolt,
  cilChatBubble,
} from '@coreui/icons';

interface AppraisalLeftPanelProps {
  projectId: number;
  projectName: string;
  collapsed: boolean;
  width: number;
  onWidthChange: (w: number) => void;
}

export function AppraisalLeftPanel({
  projectName,
  collapsed,
  width,
  onWidthChange,
}: AppraisalLeftPanelProps) {
  const leftClass = ['appraisal-left', collapsed && 'collapsed'].filter(Boolean).join(' ');

  // Right-edge drag handle — resizes width in place
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      onWidthChange(dragRef.current.startWidth + delta);
    },
    [onWidthChange]
  );

  const onUp = useCallback(() => {
    dragRef.current = null;
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }, [onMove]);

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startX: e.clientX, startWidth: width };
      document.body.classList.add('resizing');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [width, onMove, onUp]
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('resizing');
    };
  }, [onMove, onUp]);

  return (
    <div className={leftClass} style={collapsed ? undefined : { width }}>
      {!collapsed && (
        <div
          className="appraisal-left-resize"
          onMouseDown={onDown}
          title="Drag to resize"
        />
      )}
      {/* Top action block */}
      <div className="appraisal-left-top">
        <button type="button" className="appraisal-left-btn">
          <CIcon icon={cilLaptop} size="sm" />
          Desktop
        </button>
        <button type="button" className="appraisal-left-btn primary">
          <CIcon icon={cilPlus} size="sm" />
          New job
        </button>
        <div className="appraisal-left-divider compact" />
        <button type="button" className="appraisal-left-btn">
          <CIcon icon={cilChatBubble} size="sm" />
          New conversation
        </button>
        <button type="button" className="appraisal-left-btn">
          <CIcon icon={cilSearch} size="sm" />
          Search
        </button>
      </div>

      <div className="appraisal-left-divider" />

      {/* Agents */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">
          <span>Agents</span>
          <span className="appraisal-ls-label-action">+ New</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilSpeedometer} size="sm" className="appraisal-ls-icon success" />
          Market intelligence
          <span className="appraisal-ls-item-badge running">Running</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilBolt} size="sm" className="appraisal-ls-icon muted" />
          Comp monitor
          <span className="appraisal-ls-item-badge idle">Idle</span>
        </div>
      </div>

      <div className="appraisal-left-divider" />

      {/* Client */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">
          <span>Client</span>
        </div>
        <div className="appraisal-ls-item stacked">
          <span className="appraisal-ls-stacked-primary">Kidder Matthews</span>
          <span className="appraisal-ls-stacked-secondary">Bob Dietrich, MAI</span>
        </div>
      </div>

      <div className="appraisal-left-divider" />

      {/* Jobs */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">
          <span>Jobs</span>
          <span className="appraisal-ls-label-chevron">›</span>
        </div>
        <div className="appraisal-ls-item active">
          <div className="appraisal-ls-dot green" />
          {projectName}
        </div>
        <div className="appraisal-ls-item">
          <div className="appraisal-ls-dot purple" />
          Mesa Grande Industrial
        </div>
        <div className="appraisal-ls-item">
          <div className="appraisal-ls-dot gray" />
          7th Ave Retail
        </div>
      </div>

      <div className="appraisal-left-divider" />

      {/* Threads — Income */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">
          <span>Threads — Income</span>
          <span className="appraisal-ls-label-action">+ New</span>
        </div>
        <div className="appraisal-ls-item active">
          <CIcon icon={cilCommentSquare} size="sm" className="appraisal-ls-icon success" />
          Income approach setup
          <span className="appraisal-ls-item-date">Today</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilCommentSquare} size="sm" className="appraisal-ls-icon muted" />
          Rent comp analysis
          <span className="appraisal-ls-item-date">Today</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilCommentSquare} size="sm" className="appraisal-ls-icon muted" />
          Unit mix verification
          <span className="appraisal-ls-item-date">Apr 1</span>
        </div>
      </div>
    </div>
  );
}
