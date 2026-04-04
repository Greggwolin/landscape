'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const CATEGORIES = [
  'Property rights', 'Financing terms', 'Conditions of sale',
  'Market conditions', 'Location', 'Physical characteristics', 'Economic characteristics',
];

export function SalesAdjustments({ onOpenDetail }: Props) {
  return (
    <>
      <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)', marginBottom: 6 }}>Adjustment categories</div>
      {CATEGORIES.map((cat) => (
        <ProformaRow
          key={cat} dot="yellow" label={cat} value="—" valueType="waiting"
          onDoubleClick={() => onOpenDetail('generic', cat)}
        />
      ))}
    </>
  );
}
