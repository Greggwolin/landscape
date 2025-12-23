'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BudgetItem } from '@/types/budget';

export type TimelineScale = 'months' | 'quarters' | 'years';

// Phase container info for resolving division_id to phase name
export interface PhaseInfo {
  division_id: number;
  name: string;
  parent_id?: number | null;
}

interface Props {
  items: BudgetItem[];
  maxPeriod: number;
  scale: TimelineScale;
  zoomLevel?: number; // 50-200%, default 100
  phases?: PhaseInfo[]; // Container hierarchy for resolving phase names
  showDetail?: boolean; // Show/hide Description and Cost columns
  onBarClick: (item: BudgetItem) => void;
  selectedItemId?: number;
  costInflationRate?: number; // Project-level cost inflation rate (decimal, e.g., 0.03 for 3%)
}

const MIN_UNIT_WIDTH = 30; // Minimum width per time unit for readability
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 36;
const SECTION_HEADER_HEIGHT = 32;
const BAR_HEIGHT = 22;
// Column widths: Name (200) + Description (140) + Cost (80) + Start (50) + End (50)
const COL_NAME = 200;
const COL_DESC = 140;
const COL_COST = 80;
const COL_START = 50;
const COL_END = 50;

// Format currency for display
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '$0';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

// Calculate escalated amount from base amount, escalation rate, and start period
// Uses project-level costInflationRate (decimal) as fallback if item has no escalation_rate
function calculateEscalatedAmount(
  baseAmount: number | null | undefined,
  itemEscalationRate: number | null | undefined,
  startPeriod: number | null | undefined,
  projectCostInflationRate?: number // Decimal, e.g., 0.03 for 3%
): number | null {
  if (baseAmount === null || baseAmount === undefined) return null;

  // Use item rate if available, otherwise use project rate (convert decimal to percentage)
  const escalationRate = itemEscalationRate ?? (projectCostInflationRate !== undefined ? projectCostInflationRate * 100 : null);

  if (!escalationRate || !startPeriod) return baseAmount;

  // Calculate years from project start (period 1 = month 0)
  const yearsFromStart = Math.max(0, (startPeriod - 1) / 12);
  const rate = escalationRate / 100; // Convert percentage to decimal
  return Math.round(baseAmount * Math.pow(1 + rate, yearsFromStart));
}

const SCALE_CONFIG: Record<
  TimelineScale,
  { factor: number; label: (index: number) => string }
> = {
  months: {
    factor: 1,
    label: (index) => `${index + 1}`,
  },
  quarters: {
    factor: 3,
    label: (index) => `Q${index + 1}`,
  },
  years: {
    factor: 12,
    label: (index) => `Y${index + 1}`,
  },
};

type RowEntry =
  | { type: 'section'; key: string; label: string }
  | { type: 'item'; item: BudgetItem };

type RowLayout =
  | ({ type: 'section'; key: string; label: string } & { y: number; height: number })
  | ({ type: 'item'; item: BudgetItem } & { y: number; height: number });

function scopeColor(scope?: string | null, activity?: string | null, categoryName?: string | null): string {
  const map = {
    acquisition: '#3b82f6',    // Blue - Acquisition
    entitlements: '#10b981',   // Green - Entitlements (Stage 1)
    engineering: '#f59e0b',    // Amber - Engineering (Stage 2) / Civil Engineering
    development: '#ef4444',    // Red - Development (Stage 3)
    other: '#6b7280',
  };

  const candidate = (scope || activity || '').toLowerCase();
  const category = (categoryName || '').toLowerCase();

  // Check category for civil engineering first (takes priority for coloring)
  if (category.includes('civil engineering') || category.includes('civil eng')) {
    return map.engineering;
  }

  if (candidate.includes('acquisition')) return map.acquisition;
  if (candidate.includes('entitlement') || candidate.includes('stage 1') || candidate.includes('planning')) {
    return map.entitlements;
  }
  if (candidate.includes('engineering') || candidate.includes('stage 2')) {
    return map.engineering;
  }
  if (candidate.includes('development') || candidate.includes('stage 3')) {
    return map.development;
  }
  return map.other;
}

function isPreDevelopment(item: BudgetItem): boolean {
  const scopeText = (item.scope || '').toLowerCase();
  const lifecycle = ((item as any).lifecycle_stage || item.activity || '').toString().toLowerCase();
  const breadcrumb = (item.category_breadcrumb || item.category_name || '').toLowerCase();
  const keywords = ['entitlement', 'engineering', 'planning', 'pre-development', 'predevelopment'];

  if (keywords.some((word) => scopeText.includes(word) || lifecycle.includes(word) || breadcrumb.includes(word))) {
    return true;
  }

  if (scopeText.includes('stage 1') || lifecycle.includes('stage 1')) {
    return true;
  }

  return false;
}

export default function GanttChart({ items, maxPeriod, scale, zoomLevel = 100, phases = [], showDetail = true, onBarClick, selectedItemId, costInflationRate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800); // Default fallback

  // Calculate frozen width based on showDetail
  const FROZEN_WIDTH = showDetail
    ? COL_NAME + COL_DESC + COL_COST + COL_START + COL_END
    : COL_NAME + COL_START + COL_END;

  // Measure container width on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = container.clientWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Helper to check if item is a contingency line item
  const isContingency = (item: BudgetItem): boolean => {
    const categoryText = [
      item.category_l1_name,
      item.category_l2_name,
      item.category_l3_name,
      item.category_l4_name,
      item.category_name,
      item.category_breadcrumb,
      item.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return categoryText.includes('contingency');
  };

  // Helper to resolve phase name from division_id using phases array
  const getPhaseName = (divisionId: number | null): string => {
    if (!divisionId || phases.length === 0) return '';
    const phase = phases.find((p) => p.division_id === divisionId);
    return phase?.name || '';
  };

  const timedItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.start_period != null &&
          item.periods_to_complete != null &&
          item.periods_to_complete > 0 &&
          item.start_period > 0 &&
          !isContingency(item) // Filter out contingency items by default
      ),
    [items]
  );

  const sections = useMemo(() => {
    const pre: BudgetItem[] = [];
    const development: BudgetItem[] = [];

    timedItems.forEach((item) => {
      if (isPreDevelopment(item)) {
        pre.push(item);
      } else {
        development.push(item);
      }
    });

    const grouped: Array<{ key: string; label: string; items: BudgetItem[] }> = [];
    if (pre.length) grouped.push({ key: 'pre', label: 'Pre-Development', items: pre });
    if (development.length) grouped.push({ key: 'dev', label: 'Development', items: development });
    return grouped;
  }, [timedItems]);

  const rows: RowEntry[] = useMemo(() => {
    const result: RowEntry[] = [];
    sections.forEach((section) => {
      result.push({ type: 'section', key: section.key, label: section.label });
      section.items.forEach((item) => result.push({ type: 'item', item }));
    });
    return result;
  }, [sections]);

  const rowLayouts: RowLayout[] = useMemo(() => {
    let y = 0;
    return rows.map((row) => {
      const height = row.type === 'section' ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
      const layout = { ...row, y, height } as RowLayout;
      y += height;
      return layout;
    });
  }, [rows]);

  const contentHeight = useMemo(
    () => rowLayouts.reduce((acc, row) => Math.max(acc, row.y + row.height), 0),
    [rowLayouts]
  );

  const { factor, label: unitLabel } = SCALE_CONFIG[scale];
  const unitCount = Math.max(1, Math.ceil(maxPeriod / factor));

  // Calculate unit width based on zoom level
  // At 100% zoom, fit all periods in available space (no scrolling)
  // Above 100%, allow horizontal scrolling
  const availableWidth = containerWidth - FROZEN_WIDTH - 2; // -2 for border
  const baseUnitWidth = Math.max(MIN_UNIT_WIDTH, Math.floor(availableWidth / unitCount));
  const unitWidth = Math.floor(baseUnitWidth * (zoomLevel / 100));
  const svgWidth = unitCount * unitWidth;

  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    if (!leftPanel || !rightPanel) return;

    const handleRightScroll = () => {
      leftPanel.scrollTop = rightPanel.scrollTop;
    };
    const handleLeftScroll = () => {
      rightPanel.scrollTop = leftPanel.scrollTop;
    };

    rightPanel.addEventListener('scroll', handleRightScroll);
    leftPanel.addEventListener('scroll', handleLeftScroll);

    return () => {
      rightPanel.removeEventListener('scroll', handleRightScroll);
      leftPanel.removeEventListener('scroll', handleLeftScroll);
    };
  }, []);

  const bars = useMemo(() => {
    return rowLayouts
      .filter((row): row is Extract<RowLayout, { type: 'item' }> => row.type === 'item')
      .map((row, index) => {
        const item = row.item;
        const start = item.start_period || 0;
        const duration = item.periods_to_complete || 0;
        const barX = ((start - 1) / factor) * unitWidth;
        const barWidth = (duration / factor) * unitWidth - 4;
        const barY = row.y + (row.height - BAR_HEIGHT) / 2;
        const isSelected = selectedItemId === item.fact_id;
        const categoryName = item.category_l3_name || item.category_l2_name || item.category_name || '';
        const fill = isSelected ? '#0d6efd' : scopeColor(item.scope, item.activity, categoryName);

        return (
          <g key={item.fact_id ?? `${item.category_id}-${index}`}>
            <rect
              x={Math.max(barX, 0)}
              y={barY}
              width={Math.max(barWidth, 6)}
              height={BAR_HEIGHT}
              rx={4}
              fill={fill}
              opacity={isSelected ? 1 : 0.88}
              onClick={() => onBarClick(item)}
              style={{ cursor: 'pointer' }}
              className="gantt-bar"
            />
            {barWidth > 40 && (
              <text
                x={barX + Math.max(barWidth, 6) / 2}
                y={barY + BAR_HEIGHT / 2 + 4}
                textAnchor="middle"
                fontSize={10}
                fill="#ffffff"
                pointerEvents="none"
              >
                {duration}
              </text>
            )}
          </g>
        );
      });
  }, [rowLayouts, factor, unitWidth, selectedItemId, onBarClick]);

  if (timedItems.length === 0) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-secondary"
        style={{ height: 300, border: '2px dashed var(--cui-border-color)', borderRadius: 8 }}
      >
        <div className="text-center">
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <p>No items with timing data</p>
          <p className="small">Set Start Period and Duration on budget items to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="gantt-container"
      style={{
        display: 'flex',
        border: '1px solid var(--cui-border-color)',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'var(--cui-body-bg)',
      }}
    >
      <div
        style={{
          width: FROZEN_WIDTH,
          flexShrink: 0,
          borderRight: '2px solid var(--cui-border-color)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: HEADER_HEIGHT,
            display: 'flex',
            borderBottom: '1px solid var(--cui-border-color)',
            backgroundColor: 'var(--cui-tertiary-bg)',
          }}
        >
          <div
            style={{
              width: COL_NAME,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Item Name
          </div>
          {showDetail && (
            <>
              <div
                style={{
                  width: COL_DESC,
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 600,
                  fontSize: 12,
                  borderLeft: '1px solid var(--cui-border-color)',
                }}
              >
                Description
              </div>
              <div
                style={{
                  width: COL_COST,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  fontWeight: 600,
                  fontSize: 12,
                  borderLeft: '1px solid var(--cui-border-color)',
                }}
              >
                Cost
              </div>
            </>
          )}
          <div
            style={{
              width: COL_START,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 12,
              borderLeft: '1px solid var(--cui-border-color)',
            }}
          >
            Start
          </div>
          <div
            style={{
              width: COL_END,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 12,
              borderLeft: '1px solid var(--cui-border-color)',
            }}
          >
            End
          </div>
        </div>

        <div
          ref={leftPanelRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {rowLayouts.map((row, index) => {
            if (row.type === 'section') {
              return (
                <div
                  key={`section-left-${row.key}-${index}`}
                  style={{
                    height: row.height,
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                    fontSize: 12,
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    borderBottom: '1px solid var(--cui-border-color)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {row.label}
                </div>
              );
            }

            const item = row.item;
            const start = item.start_period || 0;
            const duration = item.periods_to_complete || 0;
            const end = start + duration - 1;
            const isSelected = selectedItemId === item.fact_id;

            // Build display name: Phase + Category (e.g., "Phase 1.1: Land Planning")
            // First try to resolve phase name from division_id, fall back to container fields
            const phaseName = getPhaseName(item.division_id);
            // Add "Phase " prefix if we have a phase name (e.g., "1.1" -> "Phase 1.1")
            const containerPrefix = phaseName
              ? `Phase ${phaseName}`
              : item.container_display || item.container_name || '';
            // Use the most specific category level available (L4 > L3 > L2 > L1)
            const categoryName = item.category_l4_name || item.category_l3_name || item.category_l2_name || item.category_name || '';
            const displayName = containerPrefix
              ? `${containerPrefix}: ${categoryName}`
              : categoryName || `Item ${item.fact_id}`;

            // Description from notes field (vendor name, line item description)
            const description = item.notes || '';

            return (
              <div
                key={item.fact_id ?? `${item.category_id}-${index}`}
                style={{
                  height: row.height,
                  display: 'flex',
                  borderBottom: '1px solid var(--cui-border-color-translucent)',
                  backgroundColor: isSelected ? 'var(--cui-primary-bg-subtle)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => onBarClick(item)}
              >
                <div
                  style={{
                    width: COL_NAME,
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={displayName}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: scopeColor(item.scope, item.activity, categoryName),
                      marginRight: 8,
                      flexShrink: 0,
                    }}
                  />
                  {displayName}
                </div>
                {showDetail && (
                  <>
                    <div
                      style={{
                        width: COL_DESC,
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 11,
                        borderLeft: '1px solid var(--cui-border-color-translucent)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--cui-secondary-color)',
                      }}
                      title={description}
                    >
                      {description}
                    </div>
                    <div
                      style={{
                        width: COL_COST,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: 8,
                        fontSize: 12,
                        borderLeft: '1px solid var(--cui-border-color-translucent)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(calculateEscalatedAmount(item.amount, item.escalation_rate, item.start_period, costInflationRate))}
                    </div>
                  </>
                )}
                <div
                  style={{
                    width: COL_START,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    borderLeft: '1px solid var(--cui-border-color-translucent)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {start}
                </div>
                <div
                  style={{
                    width: COL_END,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    borderLeft: '1px solid var(--cui-border-color-translucent)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {end}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={rightPanelRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <svg
          width={svgWidth}
          height={HEADER_HEIGHT}
          style={{
            flexShrink: 0,
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderBottom: '1px solid var(--cui-border-color)',
          }}
        >
          {Array.from({ length: unitCount }, (_, i) => {
            const x = i * unitWidth;
            return (
              <g key={`${scale}-marker-${i}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={HEADER_HEIGHT}
                  stroke="var(--cui-border-color-translucent)"
                  strokeWidth={1}
                />
                <text
                  x={x + unitWidth / 2}
                  y={HEADER_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--cui-secondary-color)"
                >
                  {unitLabel(i)}
                </text>
              </g>
            );
          })}
        </svg>

        <svg width={svgWidth} height={contentHeight} style={{ display: 'block' }}>
          {rowLayouts
            .filter((row): row is Extract<RowLayout, { type: 'section' }> => row.type === 'section')
            .map((row) => (
              <g key={`section-bg-${row.key}`}>
                <rect
                  x={0}
                  y={row.y}
                  width={svgWidth}
                  height={row.height}
                  fill="var(--cui-tertiary-bg)"
                />
                <line
                  x1={0}
                  y1={row.y + row.height}
                  x2={svgWidth}
                  y2={row.y + row.height}
                  stroke="var(--cui-border-color)"
                  strokeWidth={1.5}
                />
                <text
                  x={12}
                  y={row.y + row.height / 2 + 4}
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--cui-secondary-color)"
                >
                  {row.label}
                </text>
              </g>
            ))}

          {/* Draw vertical grid lines only for data rows, not section headers */}
          {rowLayouts
            .filter((row): row is Extract<RowLayout, { type: 'item' }> => row.type === 'item')
            .map((row) =>
              Array.from({ length: unitCount + 1 }, (_, i) => {
                const x = i * unitWidth;
                return (
                  <line
                    key={`grid-${row.item.fact_id}-${i}`}
                    x1={x}
                    y1={row.y}
                    x2={x}
                    y2={row.y + row.height}
                    stroke="var(--cui-border-color-translucent)"
                    strokeWidth={1}
                  />
                );
              })
            )}

          {rowLayouts.map((row, index) => (
            <line
              key={`row-line-${index}`}
              x1={0}
              y1={row.y + row.height}
              x2={svgWidth}
              y2={row.y + row.height}
              stroke="var(--cui-border-color-translucent)"
              strokeWidth={1}
            />
          ))}

          {bars}
        </svg>
      </div>

      <style jsx>{`
        .gantt-container .gantt-bar:hover {
          opacity: 1 !important;
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
