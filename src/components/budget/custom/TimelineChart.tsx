'use client';

import React, { useMemo } from 'react';
import { BudgetItem } from './hooks/useBudgetData';
import { useCalculations } from './hooks/useCalculations';

interface TimelineChartProps {
  data: BudgetItem[];
  height?: number;
}

export default function TimelineChart({ data, height = 600 }: TimelineChartProps) {
  const { calculateDuration } = useCalculations();

  const { startDate, endDate, months, totalMonths } = useMemo(() => {
    if (data.length === 0) {
      return { startDate: new Date(), endDate: new Date(), months: [], totalMonths: 0 };
    }

    // Find overall project start and end
    const dates = data.flatMap((item) => [
      new Date(item.start_date),
      new Date(item.end_date),
    ]);

    const projectStart = new Date(Math.min(...dates.map((d) => d.getTime())));
    const projectEnd = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Round to start of month
    projectStart.setDate(1);
    projectEnd.setMonth(projectEnd.getMonth() + 1);
    projectEnd.setDate(0);

    // Generate month labels
    const monthsArray: Date[] = [];
    const current = new Date(projectStart);
    while (current <= projectEnd) {
      monthsArray.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return {
      startDate: projectStart,
      endDate: projectEnd,
      months: monthsArray,
      totalMonths: monthsArray.length,
    };
  }, [data]);

  const getXPosition = (date: Date): number => {
    const monthsSinceStart =
      (date.getFullYear() - startDate.getFullYear()) * 12 +
      (date.getMonth() - startDate.getMonth());
    return (monthsSinceStart / totalMonths) * 100;
  };

  const getBarColor = (scope: string): string => {
    switch (scope) {
      case 'Acquisition':
        return '#ef4444'; // Red
      case 'Stage 1':
        return '#3b82f6'; // Blue
      case 'Stage 2':
        return '#10b981'; // Green
      case 'Stage 3':
        return '#f59e0b'; // Orange
      default:
        return '#6b7280'; // Gray
    }
  };

  const rowHeight = 32;
  const headerHeight = 60;
  const chartHeight = data.length * rowHeight + headerHeight;

  return (
    <div className="timeline-chart-container">
      <svg width="100%" height={chartHeight} className="timeline-svg">
        {/* Timeline header with month labels */}
        <g className="timeline-header">
          {/* Background */}
          <rect x="0" y="0" width="100%" height={headerHeight} fill="#1e293b" />

          {/* Month columns */}
          {months.map((month, idx) => {
            const x = (idx / totalMonths) * 100;
            const width = (1 / totalMonths) * 100;

            return (
              <g key={idx}>
                {/* Vertical grid line */}
                <line
                  x1={`${x}%`}
                  y1={headerHeight}
                  x2={`${x}%`}
                  y2={chartHeight}
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Month label */}
                <text
                  x={`${x + width / 2}%`}
                  y={headerHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#cbd5e1"
                  fontSize="12"
                  fontWeight="500"
                >
                  {month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            );
          })}
        </g>

        {/* Timeline bars for each budget item */}
        <g className="timeline-bars" transform={`translate(0, ${headerHeight})`}>
          {data.map((item, idx) => {
            const itemStart = new Date(item.start_date);
            const itemEnd = new Date(item.end_date);
            const xStart = getXPosition(itemStart);
            const xEnd = getXPosition(itemEnd);
            const barWidth = xEnd - xStart;
            const y = idx * rowHeight + 4;
            const barHeight = rowHeight - 8;

            const color = getBarColor(item.scope);

            return (
              <g key={item.fact_id} className="timeline-bar">
                {/* Row background (alternating) */}
                <rect
                  x="0"
                  y={idx * rowHeight}
                  width="100%"
                  height={rowHeight}
                  fill={idx % 2 === 0 ? '#0f172a' : '#1e293b'}
                />

                {/* Timeline bar */}
                <rect
                  x={`${xStart}%`}
                  y={y}
                  width={`${barWidth}%`}
                  height={barHeight}
                  fill={color}
                  rx="4"
                  opacity="0.8"
                  className="budget-bar"
                >
                  <title>
                    {item.category_detail}
                    {'\n'}
                    {item.start_date} to {item.end_date}
                    {'\n'}
                    {item.scope}
                  </title>
                </rect>

                {/* Bar label (if wide enough) */}
                {barWidth > 5 && (
                  <text
                    x={`${xStart + barWidth / 2}%`}
                    y={y + barHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="600"
                    pointerEvents="none"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {item.category_code}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
          <span>Acquisition</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Stage 1</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
          <span>Stage 2</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Stage 3</span>
        </div>
      </div>
    </div>
  );
}
