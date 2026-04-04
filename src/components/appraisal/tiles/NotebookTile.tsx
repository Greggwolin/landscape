'use client';

import React from 'react';

interface Props {
  active?: boolean;
  onClick?: () => void;
}

export function NotebookTile({ active, onClick }: Props) {
  return (
    <div
      className={`appraisal-tile full-width${active ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="appraisal-tile-top">
        <span className="appraisal-tile-icon">&#128221;</span>
        <span className="appraisal-tile-dot" />
      </div>
      <div className="appraisal-tile-label">Notebook</div>
      <div className="appraisal-tile-sub">3 sessions &middot; 2 notes</div>
    </div>
  );
}
