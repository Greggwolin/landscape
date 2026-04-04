/**
 * AppraisalLeftPanel
 *
 * Left sidebar: Desktop link, New project, New conversation, Search,
 * Agents section, Projects list, Starred, project-scoped thread history.
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';

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
        <button className="appraisal-left-btn">◻ Desktop</button>
        <button className="appraisal-left-btn primary">
          <span style={{ fontSize: 14 }}>+</span> New project
        </button>
        <div className="appraisal-left-divider" style={{ margin: '4px 0' }} />
        <button className="appraisal-left-btn">
          <span style={{ fontSize: 14 }}>+</span> New conversation
        </button>
        <button className="appraisal-left-btn">⌕ Search</button>
      </div>

      <div className="appraisal-left-divider" />

      {/* Agents */}
      <div className="appraisal-left-section">
        <div className="appraisal-ls-label">
          <span>Agents</span>
          <span className="appraisal-ls-label-action">+ New</span>
        </div>
        <div className="appraisal-ls-item">
          <span style={{ fontSize: 10, color: 'var(--cui-success)' }}>●</span>
          Market intelligence
          <span className="appraisal-ls-item-badge running">Running</span>
        </div>
        <div className="appraisal-ls-item">
          <span style={{ fontSize: 10, color: 'var(--cui-tertiary-color)' }}>●</span>
          Comp monitor
          <span className="appraisal-ls-item-badge idle">Idle</span>
        </div>
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
        {/* Placeholder items — these would come from the project list API */}
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
          <span style={{ color: 'var(--cui-warning)', fontSize: 10 }}>★</span>
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
        {/* TODO: Wire to ThreadList component filtered by projectId */}
        <div className="appraisal-ls-item active">
          <div className="appraisal-ls-dot green" />
          Income approach setup
          <span className="appraisal-ls-item-date">Today</span>
        </div>
        <div className="appraisal-ls-item">
          <div className="appraisal-ls-dot gray" />
          Rent comp analysis
          <span className="appraisal-ls-item-date">Today</span>
        </div>
      </div>
    </div>
  );
}
