// v1.0 · 2025-11-02 · Selection sync + scope colors
'use client';

import type { BudgetItem } from '../ColumnDefinitions';

interface Props {
  data: BudgetItem[];
  selectedItem?: BudgetItem;
  onItemSelect?: (item: BudgetItem) => void;
}

export default function TimelineChart({ data, selectedItem, onItemSelect }: Props) {
  const horizon = Math.max(
    60,
    ...data.map((item) => (item.start_period || 0) + (item.periods_to_complete || 0))
  );
  const height = data.length * 28 + 20;

  return (
    <div className="border rounded p-3 bg-body">
      <div className="small fw-semibold mb-2">Timeline</div>
      <svg width="100%" height={height}>
        {data.map((item, index) => {
          const start = item.start_period || 0;
          const duration = item.periods_to_complete || 0;
          const startPercent = horizon === 0 ? 0 : (start / horizon) * 100;
          const widthPercent = horizon === 0 ? 0 : (duration / horizon) * 100;
          const isSelected = selectedItem?.fact_id === item.fact_id;
          const fill = isSelected ? '#0d6efd' : scopeColor(item.scope);

          return (
            <g key={item.fact_id ?? `${item.category_id}-${index}`}>
              <rect
                x={`${startPercent}%`}
                y={index * 26}
                width={`${widthPercent}%`}
                height={20}
                rx={4}
                fill={fill}
                opacity={0.9}
                onClick={() => onItemSelect?.(item)}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={`${startPercent + 0.5}%`}
                y={index * 26 + 14}
                fill="#ffffff"
                fontSize="10"
                pointerEvents="none"
              >
                {(item.category_name || '').slice(0, 22)}
              </text>
            </g>
          );
        })}
      </svg>
      {data.length === 0 && (
        <div className="text-center text-secondary small">No timeline data to display</div>
      )}
    </div>
  );
}

function scopeColor(scope?: string | null) {
  const map: Record<string, string> = {
    Acquisition: '#dc3545',
    'Stage 1': '#0d6efd',
    'Stage 2': '#198754',
    'Stage 3': '#fd7e14',
    Other: '#6c757d',
  };

  if (!scope) {
    return map.Other;
  }

  return map[scope] ?? map.Other;
}
