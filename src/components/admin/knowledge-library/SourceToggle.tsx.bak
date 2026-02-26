'use client';

import React from 'react';
import { CButton, CButtonGroup } from '@coreui/react';

export type SourceFilter = 'all' | 'user' | 'platform';

interface SourceToggleProps {
  active: SourceFilter;
  counts: { all: number; user: number; platform: number };
  onChange: (source: SourceFilter) => void;
}

const SOURCE_OPTIONS: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'My Documents' },
  { key: 'platform', label: 'Platform Knowledge' },
];

export default function SourceToggle({ active, counts, onChange }: SourceToggleProps) {
  return (
    <CButtonGroup className="kl-source-toggle" role="group">
      {SOURCE_OPTIONS.map(({ key, label }) => (
        <CButton
          key={key}
          color={active === key ? 'primary' : 'secondary'}
          variant={active === key ? undefined : 'ghost'}
          size="sm"
          className={active === key ? 'kl-source-active' : ''}
          onClick={() => onChange(key)}
        >
          {label} ({counts[key]})
        </CButton>
      ))}
    </CButtonGroup>
  );
}
