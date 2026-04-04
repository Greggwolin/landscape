'use client';

import React from 'react';

interface CompMiniRowProps {
  label: string;
  units?: string;
  sale?: string;
  psfValue?: string;
  perUnit?: string;
  isWaiting?: boolean;
  isHeader?: boolean;
  onDoubleClick?: () => void;
}

export function CompMiniRow({
  label,
  units,
  sale,
  psfValue,
  perUnit,
  isWaiting = false,
  isHeader = false,
  onDoubleClick,
}: CompMiniRowProps) {
  const rowClass = [
    'um-row',
    isHeader && 'header',
    isWaiting && 'waiting',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass} onDoubleClick={onDoubleClick}>
      <span className="um-type">{label}</span>
      <span className="um-units">{units || '—'}</span>
      <span className="um-sf">{sale || '—'}</span>
      <span className="um-rent">{psfValue || '—'}</span>
      <span className="um-total">{perUnit || '—'}</span>
    </div>
  );
}
