'use client';

import React, { useMemo } from 'react';
import { BudgetItem } from './ColumnDefinitions';

interface TimelineChartPeriodsProps {
  data: BudgetItem[];
  selectedItem?: BudgetItem;
  onItemSelect?: (item: BudgetItem) => void;
}

function getScopeColor(scope?: string): string {
  const colors: Record<string, string> = {
    'Acquisition': '#ef4444',     // red
    'Stage 1': '#3b82f6',          // blue
    'Stage 2': '#10b981',          // green
    'Stage 3': '#f59e0b',          // amber
    'Capital Cost / Interest': '#8b5cf6', // purple
    'Diligence': '#ec4899',        // pink
    'Other': '#6b7280',            // gray
  };
  return colors[scope || 'Other'] || '#6b7280';
}

export default function TimelineChartPeriods({
  data,
  selectedItem,
  onItemSelect
}: TimelineChartPeriodsProps) {
  const { minPeriod, maxPeriod, periodMarkers } = useMemo(() => {
    if (data.length === 0) {
      return { minPeriod: 1, maxPeriod: 60, periodMarkers: [] };
    }

    // Find min and max periods
    const periods = data
      .filter(item => item.start_period !== null && item.periods_to_complete !== null)
      .flatMap(item => [
        item.start_period!,
        item.start_period! + item.periods_to_complete!
      ]);

    if (periods.length === 0) {
      return { minPeriod: 1, maxPeriod: 60, periodMarkers: [] };
    }

    const min = Math.max(Math.min(...periods) - 2, 1);
    const max = Math.max(...periods) + 6;

    // Generate period markers (show max 24 periods to avoid crowding)
    const markers = [];
    const step = Math.ceil((max - min) / 24);
    for (let period = min; period <= max; period += step) {
      markers.push(period);
    }

    return { minPeriod: min, maxPeriod: max, periodMarkers: markers };
  }, [data]);

  const rowHeight = 32;
  const headerHeight = 50;
  const chartHeight = data.length * rowHeight + headerHeight;
  const chartWidth = 1000;

  return (
    <div className="timeline-chart-periods bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="mb-2">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Timeline
        </h4>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <div className="mb-2" style={{ fontSize: '2rem' }}>📊</div>
          <p className="small">No timeline data to display</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <svg width={chartWidth} height={chartHeight} className="timeline-svg">
            {/* Header background */}
            <rect
              x={0}
              y={0}
              width={chartWidth}
              height={headerHeight}
              style={{ fill: 'var(--cui-tertiary-bg)' }}
            />

            {/* Period markers */}
            {periodMarkers.map((period, i) => {
              const x = ((period - minPeriod) / (maxPeriod - minPeriod)) * chartWidth;
              return (
                <g key={i}>
                  {/* Vertical grid line */}
                  <line
                    x1={x}
                    y1={headerHeight}
                    x2={x}
                    y2={chartHeight}
                    stroke="var(--cui-border-color)"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    opacity={0.5}
                  />

                  {/* Period label */}
                  <text
                    x={x}
                    y={headerHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fill: 'var(--cui-secondary-color)' }}
                    fontSize={11}
                  >
                    M{period}
                  </text>
                </g>
              );
            })}

            {/* Timeline bars */}
            <g transform={`translate(0, ${headerHeight})`}>
              {data.map((item, index) => {
                if (!item.start_period || !item.periods_to_complete) {
                  return null;
                }

                const startX = ((item.start_period - minPeriod) / (maxPeriod - minPeriod)) * chartWidth;
                const barWidth = (item.periods_to_complete / (maxPeriod - minPeriod)) * chartWidth;
                const y = index * rowHeight;
                const barHeight = rowHeight - 8;
                const isSelected = selectedItem?.fact_id === item.fact_id;

                const color = isSelected ? '#3b82f6' : getScopeColor(item.scope);

                return (
                  <g key={item.fact_id}>
                    {/* Row background */}
                    <rect
                      x={0}
                      y={y}
                      width={chartWidth}
                      height={rowHeight}
                      fill={index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)'}
                    />

                    {/* Timeline bar */}
                    <rect
                      x={startX}
                      y={y + 4}
                      width={Math.max(barWidth, 2)}
                      height={barHeight}
                      fill={color}
                      opacity={isSelected ? 0.95 : 0.75}
                      rx={4}
                      className="cursor-pointer transition-opacity"
                      onClick={() => onItemSelect?.(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>
                        {item.category_name || 'Budget Item'}
                        {'\n'}Period {item.start_period} - {item.start_period + item.periods_to_complete}
                        {'\n'}{item.scope}
                      </title>
                    </rect>

                    {/* Selection highlight */}
                    {isSelected && (
                      <rect
                        x={startX}
                        y={y + 4}
                        width={Math.max(barWidth, 2)}
                        height={barHeight}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={3}
                        rx={4}
                        pointerEvents="none"
                      />
                    )}

                    {/* Bar label (if wide enough) */}
                    {barWidth > 60 && (
                      <text
                        x={startX + barWidth / 2}
                        y={y + rowHeight / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={10}
                        fontWeight={500}
                        pointerEvents="none"
                      >
                        {item.category_name?.substring(0, 20)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {/* Legend */}
      {data.length > 0 && (
        <div className="d-flex gap-3 mt-3 flex-wrap">
          {[
            { scope: 'Acquisition', color: '#ef4444' },
            { scope: 'Stage 1', color: '#3b82f6' },
            { scope: 'Stage 2', color: '#10b981' },
            { scope: 'Stage 3', color: '#f59e0b' },
          ].map(({ scope, color }) => (
            <div key={scope} className="d-flex align-items-center gap-1">
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: color,
                  borderRadius: '2px'
                }}
              />
              <span className="small text-muted">{scope}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
