/**
 * Cost Granularity Toggle
 * Button group for switching between cost grouping levels
 */

'use client';

import React from 'react';
import { CButtonGroup, CButton } from '@coreui/react';
import type { CostGranularity } from '@/lib/financial-engine/cashflow/aggregation';

interface Props {
  value: CostGranularity;
  onChange: (granularity: CostGranularity) => void;
  disabled?: boolean;
}

const GRANULARITY_OPTIONS: { value: CostGranularity; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'by_stage', label: 'By Stage' },
  { value: 'by_category', label: 'By Category' },
  { value: 'by_phase', label: 'By Phase' },
];

export default function CostGranularityToggle({ value, onChange, disabled = false }: Props) {
  return (
    <CButtonGroup size="sm" role="group" aria-label="Cost granularity selector">
      {GRANULARITY_OPTIONS.map((option) => (
        <CButton
          key={option.value}
          color={value === option.value ? 'primary' : 'secondary'}
          variant={value === option.value ? undefined : 'outline'}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
        </CButton>
      ))}
    </CButtonGroup>
  );
}
