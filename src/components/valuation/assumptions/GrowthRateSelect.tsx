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

const INPUT_WIDTH = 'w-[140px]';
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
  const { data: sets, isLoading, error } = useGrowthRateSets(cardType, projectId);

  // Debug logging
  console.log(`[GrowthRateSelect] ${label}: cardType=${cardType}, projectId=${projectId}, sets=`, sets, 'error=', error);

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
        {sets?.map((set) => {
          // Clean up set name (remove special chars and Global suffix)
          const cleanName = set.set_name
            .replace(/¥G/g, '')
            .replace(/\(G\)/g, '')
            .replace(/Global/gi, '')
            .trim();

          // Format rate string: single rate "(3.0%)" or multi-step "(3%, 4%, 2%)"
          let rateStr = '';
          const stepRates = (set as any).step_rates as number[] | undefined;
          if (stepRates && stepRates.length > 1) {
            // Multi-step: show comma-separated rates
            rateStr = ` (${stepRates.map((r) => `${(r * 100).toFixed(0)}%`).join(', ')})`;
          } else if (set.default_rate !== null && set.default_rate !== undefined) {
            // Single step: show single rate
            rateStr = ` (${(Number(set.default_rate) * 100).toFixed(1)}%)`;
          }

          return (
            <option key={set.set_id} value={set.set_id}>
              {cleanName}{rateStr}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default GrowthRateSelect;
