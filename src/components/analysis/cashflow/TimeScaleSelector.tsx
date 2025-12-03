/**
 * Time Scale Selector
 * Button group for switching between time aggregation levels
 */

'use client';

import React from 'react';
import { CButtonGroup, CButton } from '@coreui/react';
import type { TimeScale } from '@/lib/financial-engine/cashflow/aggregation';

interface Props {
  value: TimeScale;
  onChange: (scale: TimeScale) => void;
  disabled?: boolean;
}

const TIME_SCALES: { value: TimeScale; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'overall', label: 'Overall' },
];

export default function TimeScaleSelector({ value, onChange, disabled = false }: Props) {
  return (
    <CButtonGroup size="sm" role="group" aria-label="Time scale selector">
      {TIME_SCALES.map((scale) => (
        <CButton
          key={scale.value}
          color={value === scale.value ? 'primary' : 'secondary'}
          variant={value === scale.value ? undefined : 'outline'}
          onClick={() => onChange(scale.value)}
          disabled={disabled}
        >
          {scale.label}
        </CButton>
      ))}
    </CButtonGroup>
  );
}
