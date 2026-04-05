/**
 * AppraisalLeftPanel
 *
 * Left sidebar: Desktop link, New project, Search,
 * Projects list, Starred, Thread history, Agents (bottom).
 * Uses CoreUI icons throughout — no Unicode/emoji icons.
 *
 * @version 1.1
 * @created 2026-04-04
 * @updated 2026-04-05 — Agents moved to bottom; CoreUI icons; font bump
 */

'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilLaptop,
  cilPlus,
  cilSearch,
  cilStar,
  cilCommentSquare,
  cilSpeedometer,
  cilBolt,
} from '@coreui/icons';

interface AppraisalLeftPanelProps {
  projectId: number;
  projectName: string;
  collapsed: boolean;
}

export function AppraisalLeftPanel({ projectId, projectName, collapsed }: AppraisalLeftPanelProps) {
  const leftClass = ['appraisal-left', collapsed && 'collapsed'].filter(Boolean).join(' ');

  return (
    <div className={leftClass}>
      {/* Top actions */}
      <div className="appraisal-left-top">
        <button className="appraisal-left-btn">
          <CIcon icon={cilLaptop} size="sm" />
          Desktop
        </button>
        <button className="appraisal-left-btn primary">
          <CIcon icon={cilPlus} size="sm" />
          New project
        </button>
        <div className="appraisal-left-divider" style={{ margin: '4px 0' }} />
        <button className="appraisal-left-btn">
          <CIcon icon={cilSearch} size="sm" />
          Search
        </button>
      </div>

      <div className="appraisal-left-divider" />

      {/* Projects */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label" style={{ cursor: 'pointer' }}>
          Projects ›
        </div>
        <div className="appraisal-ls-item active">
          <div className="appraisal-ls-dot green" />
          {projectName}
        </div>
        <div className="appraisal-ls-item">
          <div className="appraisal-ls-dot gray" />
          Other projects...
        </div>
      </div>

      <div className="appraisal-left-divider" />

      {/* Starred */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">Starred</div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilStar} size="sm" style={{ color: 'var(--cui-warning)', flexShrink: 0 }} />
          {projectName}
        </div>
      </div>

      <div className="appraisal-left-divider" />

      {/* Thread history */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">
          <span>Threads — {projectName}</span>
          <span className="appraisal-ls-label-action">+ New</span>
        </div>
        <div className="appraisal-ls-item active">
          <CIcon icon={cilCommentSquare} size="sm" style={{ flexShrink: 0, color: 'var(--cui-success)' }} />
          Income approach setup
          <span className="appraisal-ls-item-date">Today</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilCommentSquare} size="sm" style={{ flexShrink: 0, opacity: 0.4 }} />
          Rent comp analysis
          <span className="appraisal-ls-item-date">Today</span>
        </div>
      </div>

      {/* Spacer pushes Agents to bottom */}
      <div style={{ flex: 1 }} />

      <div className="appraisal-left-divider" />

      {/* Agents — future function set, pinned at bottom */}
      <div className="appraisal-left-section" style={{ paddingBottom: 12 }}>
        <div className="appraisal-ls-label">
          <span>Agents</span>
          <span className="appraisal-ls-label-action">+ New</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilSpeedometer} size="sm" style={{ flexShrink: 0, color: 'var(--cui-success)' }} />
          Market intelligence
          <span className="appraisal-ls-item-badge running">Running</span>
        </div>
        <div className="appraisal-ls-item">
          <CIcon icon={cilBolt} size="sm" style={{ flexShrink: 0, opacity: 0.4 }} />
          Comp monitor
          <span className="appraisal-ls-item-badge idle">Idle</span>
        </div>
      </div>
    </div>
  );
}
