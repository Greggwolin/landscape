'use client';

import React from 'react';

interface Props {
  active?: boolean;
  onClick?: () => void;
}

export function DocumentsTile({ active, onClick }: Props) {
  return (
    <div
      className={`appraisal-tile${active ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="appraisal-tile-top">
        <span className="appraisal-tile-icon">&#128196;</span>
        <span className="appraisal-tile-dot green" />
      </div>
      <div className="appraisal-tile-label">Documents</div>
      <div className="appraisal-tile-sub">8 docs &middot; 59 media</div>
    </div>
  );
}
