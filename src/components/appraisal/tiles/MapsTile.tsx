'use client';

import React from 'react';

interface Props {
  active?: boolean;
  onClick?: () => void;
}

export function MapsTile({ active, onClick }: Props) {
  return (
    <div
      className={`appraisal-tile${active ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="appraisal-tile-top">
        <span className="appraisal-tile-icon">&#127758;</span>
        <span className="appraisal-tile-dot blue" />
      </div>
      <div className="appraisal-tile-label">Maps</div>
      <div className="appraisal-tile-sub">4 layers</div>
    </div>
  );
}
