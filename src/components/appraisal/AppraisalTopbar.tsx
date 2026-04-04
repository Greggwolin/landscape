/**
 * AppraisalTopbar
 *
 * Top bar with hamburger toggle, logo, project name, approach tabs, and avatar.
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';
import type { ApproachId } from './appraisal.types';
import { ApproachTabs } from './approach/ApproachTabs';

interface AppraisalTopbarProps {
  projectName: string;
  activeApproach: ApproachId;
  onApproachChange: (id: ApproachId) => void;
  onToggleLeft: () => void;
}

export function AppraisalTopbar({
  projectName,
  activeApproach,
  onApproachChange,
  onToggleLeft,
}: AppraisalTopbarProps) {
  return (
    <div className="appraisal-topbar">
      <button className="appraisal-tb-toggle" onClick={onToggleLeft} aria-label="Toggle left panel">
        ☰
      </button>
      <div className="appraisal-tb-logo">
        <em>Landscape</em>
      </div>
      <span className="appraisal-tb-slash">/</span>
      <span className="appraisal-tb-project">{projectName}</span>
      <span className="appraisal-tb-chevron">▾</span>
      <div className="appraisal-tb-sep" />
      <ApproachTabs activeApproach={activeApproach} onApproachChange={onApproachChange} />
      <div className="appraisal-tb-spacer" />
      <div className="appraisal-tb-avatar">GW</div>
    </div>
  );
}
