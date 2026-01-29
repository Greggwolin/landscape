'use client';

/**
 * Growth Rate Select Component
 *
 * Dropdown for selecting a growth rate set from core_fin_growth_rate_sets.
 * Filters by card_type and project scope.
 *
 * Session: QK-28
 */

import React from 'react';
import { useGrowthRateSets } from '@/hooks/useDcfAnalysis';

const INPUT_WIDTH = 'w-[100px]';
const INPUT_CLASSES = 'px-1.5 py-0.5 text-right text-xs rounded';

interface GrowthRateSelectProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  cardType: 'revenue' | 'cost';
  projectId: number;
  tooltip?: string;
}

export function GrowthRateSelect({
  label,
  value,
  onChange,
  cardType,
  projectId,
  tooltip,
}: GrowthRateSelectProps) {
  const { data: sets, isLoading } = useGrowthRateSets(cardType, projectId);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange(val ? parseInt(val, 10) : null);
  };

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs whitespace-nowrap"
        style={{ color: 'var(--cui-secondary-color)' }}
        title={tooltip}
      >
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={handleChange}
        disabled={isLoading}
        className={`${INPUT_WIDTH} ${INPUT_CLASSES}`}
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <option value="">Select...</option>
        {sets?.map((set) => (
          <option key={set.set_id} value={set.set_id}>
            {set.set_name}
            {set.is_global ? ' (Global)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default GrowthRateSelect;
