'use client';

/**
 * RentScheduleGrid Component
 *
 * Audit-grade unit-level rent schedule report. Shows one row per unit with
 * gross scheduled rent for each period across the full analysis hold period.
 * Below unit rows, DCF summary rows (vacancy, credit loss, other income, NRI)
 * appear for reconciliation.
 *
 * Features:
 * - Periodicity toggle (Monthly / Quarterly / Annual)
 * - Group by: Unit (flat) / Plan Type / Bedrooms — with collapsible subtotals
 * - Export CSV
 * - GPR reconciliation with DCF
 *
 * Session: Unit Rent Schedule Report
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { UnitRentScheduleData } from '@/hooks/useIncomeApproach';

// ============================================================================
// TYPES
// ============================================================================

type TimeScale = 'monthly' | 'quarterly' | 'annual';
type GroupMode = 'unit' | 'plan_type' | 'bedrooms';

interface UnitRow {
  unit_id: number;
  unit_number: string;
  plan_name: string;
  unit_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number;
  rents: number[];
}

interface AggregatedPeriod {
  id: string;
  label: string;
  startIdx: number; // inclusive
  endIdx: number;   // exclusive
}

interface GroupHeader {
  key: string;
  label: string;
  units: UnitRow[];
  subtotals: number[]; // per aggregated period
  total: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number): string {
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (value < 0) return `($${formatted})`;
  return `$${formatted}`;
}

function buildAggregatedPeriods(
  periods: Array<{ period_id: string; period_label: string }>,
  timeScale: TimeScale,
): AggregatedPeriod[] {
  if (timeScale === 'monthly') {
    return periods.map((p, i) => ({
      id: p.period_id,
      label: p.period_label,
      startIdx: i,
      endIdx: i + 1,
    }));
  }

  if (timeScale === 'quarterly') {
    const quarters: AggregatedPeriod[] = [];
    for (let i = 0; i < periods.length; i += 3) {
      const end = Math.min(i + 3, periods.length);
      const qNum = Math.floor(i / 3) % 4 + 1;
      const year = periods[i].period_id.slice(0, 4);
      quarters.push({
        id: `${year}-Q${qNum}`,
        label: `Q${qNum} ${year}`,
        startIdx: i,
        endIdx: end,
      });
    }
    return quarters;
  }

  // annual
  const years: AggregatedPeriod[] = [];
  for (let i = 0; i < periods.length; i += 12) {
    const end = Math.min(i + 12, periods.length);
    const yearNum = Math.floor(i / 12) + 1;
    years.push({
      id: `year-${yearNum}`,
      label: `Year ${yearNum}`,
      startIdx: i,
      endIdx: end,
    });
  }
  return years;
}

function sumRange(arr: number[], start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end && i < arr.length; i++) {
    sum += arr[i];
  }
  return Math.round(sum * 100) / 100;
}

function sumAll(arr: number[]): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return Math.round(sum * 100) / 100;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface RentScheduleGridProps {
  data: UnitRentScheduleData | null;
  isLoading: boolean;
}

export function RentScheduleGrid({ data, isLoading }: RentScheduleGridProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>('monthly');
  const [groupMode, setGroupMode] = useState<GroupMode>('unit');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Aggregated periods
  const aggPeriods = useMemo(() => {
    if (!data) return [];
    return buildAggregatedPeriods(data.periods, timeScale);
  }, [data, timeScale]);

  // Compute aggregated unit rents per period
  const unitAggRents = useMemo(() => {
    if (!data) return new Map<number, number[]>();
    const map = new Map<number, number[]>();
    for (const unit of data.units) {
      const agg = aggPeriods.map((p) => sumRange(unit.rents, p.startIdx, p.endIdx));
      map.set(unit.unit_id, agg);
    }
    return map;
  }, [data, aggPeriods]);

  // Group headers (for plan_type / bedrooms modes)
  const groups = useMemo<GroupHeader[]>(() => {
    if (!data || groupMode === 'unit') return [];

    const groupMap = new Map<string, UnitRow[]>();
    for (const unit of data.units) {
      const key = groupMode === 'plan_type'
        ? (unit.plan_name || 'Unknown')
        : (unit.bedrooms != null ? `${unit.bedrooms} BR` : 'Unknown');
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(unit);
    }

    const result: GroupHeader[] = [];
    const sortedKeys = Array.from(groupMap.keys()).sort();
    for (const key of sortedKeys) {
      const units = groupMap.get(key)!;
      const subtotals = aggPeriods.map((_, pi) => {
        let sum = 0;
        for (const u of units) {
          const agg = unitAggRents.get(u.unit_id);
          if (agg) sum += agg[pi];
        }
        return Math.round(sum * 100) / 100;
      });
      const total = subtotals.reduce((a, b) => a + b, 0);
      result.push({ key, label: key, units, subtotals, total: Math.round(total * 100) / 100 });
    }
    return result;
  }, [data, groupMode, aggPeriods, unitAggRents]);

  // GPR aggregated per period
  const aggGpr = useMemo(() => {
    if (!data) return [];
    return aggPeriods.map((p) => sumRange(data.gpr_by_period, p.startIdx, p.endIdx));
  }, [data, aggPeriods]);

  // DCF summary rows aggregated per period
  const aggSummaryRows = useMemo(() => {
    if (!data) return [];
    return data.dcf_summary_rows.map((row) => ({
      label: row.label,
      values: aggPeriods.map((p) => sumRange(row.values, p.startIdx, p.endIdx)),
      total: sumAll(row.values),
    }));
  }, [data, aggPeriods]);

  // Toggle group collapse
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (!data) return;

    const headers = ['Unit #', 'Plan', 'Type', 'SF', ...aggPeriods.map((p) => p.label), 'Total'];
    const rows: string[][] = [];

    // Unit rows
    const unitsToRender = groupMode === 'unit' ? data.units : groups.flatMap((g) => g.units);
    for (const unit of unitsToRender) {
      const agg = unitAggRents.get(unit.unit_id) || [];
      const total = agg.reduce((a, b) => a + b, 0);
      rows.push([
        unit.unit_number,
        unit.plan_name,
        unit.unit_type,
        String(unit.square_feet),
        ...agg.map((v) => v.toFixed(2)),
        total.toFixed(2),
      ]);
    }

    // Blank separator
    rows.push(headers.map(() => ''));

    // GPR row
    const gprTotal = aggGpr.reduce((a, b) => a + b, 0);
    rows.push(['', '', 'Gross Potential Rent', '', ...aggGpr.map((v) => v.toFixed(2)), gprTotal.toFixed(2)]);

    // Summary rows
    for (const sr of aggSummaryRows) {
      rows.push(['', '', sr.label, '', ...sr.values.map((v) => v.toFixed(2)), sr.total.toFixed(2)]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rent-schedule-${timeScale}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, aggPeriods, unitAggRents, aggGpr, aggSummaryRows, timeScale, groupMode, groups]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              margin: '0 auto 0.5rem',
              borderRadius: '9999px',
              borderBottom: '2px solid var(--cui-primary)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: 'var(--cui-secondary-color)' }}>Loading Rent Schedule...</p>
        </div>
      </div>
    );
  }

  if (!data || data.units.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--cui-secondary-color)' }}>
        No unit data available for rent schedule.
      </div>
    );
  }

  // Column widths
  const labelWidth = 80;
  const planWidth = 140;
  const typeWidth = 70;
  const sfWidth = 80;
  const periodWidth = timeScale === 'monthly' ? 90 : timeScale === 'quarterly' ? 110 : 130;
  const totalWidth = 110;

  // Shared cell styles
  const cellBase: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '0.8125rem',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--cui-border-color)',
  };
  const numCell: React.CSSProperties = {
    ...cellBase,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  };
  const headerCell: React.CSSProperties = {
    ...cellBase,
    fontWeight: 600,
    backgroundColor: 'var(--cui-tertiary-bg)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 2,
  };

  const renderUnitRow = (unit: UnitRow, indent = false) => {
    const agg = unitAggRents.get(unit.unit_id) || [];
    const total = agg.reduce((a, b) => a + b, 0);

    return (
      <tr key={unit.unit_id}>
        <td style={{ ...cellBase, width: labelWidth, minWidth: labelWidth, position: 'sticky', left: 0, zIndex: 1, backgroundColor: 'var(--cui-body-bg)', paddingLeft: indent ? 24 : 8 }}>
          {unit.unit_number}
        </td>
        <td style={{ ...cellBase, width: planWidth, minWidth: planWidth, position: 'sticky', left: labelWidth, zIndex: 1, backgroundColor: 'var(--cui-body-bg)' }}>
          {unit.plan_name}
        </td>
        <td style={{ ...cellBase, width: typeWidth, minWidth: typeWidth, position: 'sticky', left: labelWidth + planWidth, zIndex: 1, backgroundColor: 'var(--cui-body-bg)' }}>
          {unit.unit_type}
        </td>
        <td style={{ ...numCell, width: sfWidth, minWidth: sfWidth, position: 'sticky', left: labelWidth + planWidth + typeWidth, zIndex: 1, backgroundColor: 'var(--cui-body-bg)', borderRight: '2px solid var(--cui-border-color)' }}>
          {unit.square_feet > 0 ? unit.square_feet.toLocaleString() : '—'}
        </td>
        {agg.map((val, pi) => (
          <td
            key={aggPeriods[pi]?.id ?? pi}
            style={{
              ...numCell,
              width: periodWidth,
              minWidth: periodWidth,
              color: val === 0 ? 'var(--cui-secondary-color)' : 'var(--cui-body-color)',
            }}
          >
            {formatCurrency(val)}
          </td>
        ))}
        <td style={{ ...numCell, width: totalWidth, minWidth: totalWidth, fontWeight: 600, position: 'sticky', right: 0, zIndex: 1, backgroundColor: 'var(--cui-body-bg)', borderLeft: '2px solid var(--cui-border-color)' }}>
          {formatCurrency(Math.round(total))}
        </td>
      </tr>
    );
  };

  const renderGroupHeaderRow = (group: GroupHeader) => {
    const isCollapsed = collapsedGroups.has(group.key);
    return (
      <tr
        key={`group-${group.key}`}
        style={{ cursor: 'pointer' }}
        onClick={() => toggleGroup(group.key)}
      >
        <td
          colSpan={4}
          style={{
            ...cellBase,
            fontWeight: 600,
            backgroundColor: 'var(--cui-tertiary-bg)',
            position: 'sticky',
            left: 0,
            zIndex: 1,
            borderRight: '2px solid var(--cui-border-color)',
          }}
        >
          <span style={{ display: 'inline-block', width: 16, fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
            {isCollapsed ? '\u25B6' : '\u25BC'}
          </span>
          {group.label} ({group.units.length} units)
        </td>
        {group.subtotals.map((val, pi) => (
          <td
            key={aggPeriods[pi]?.id ?? pi}
            style={{ ...numCell, fontWeight: 600, backgroundColor: 'var(--cui-tertiary-bg)', width: periodWidth, minWidth: periodWidth }}
          >
            {formatCurrency(val)}
          </td>
        ))}
        <td style={{ ...numCell, fontWeight: 600, backgroundColor: 'var(--cui-tertiary-bg)', width: totalWidth, minWidth: totalWidth, position: 'sticky', right: 0, zIndex: 1, borderLeft: '2px solid var(--cui-border-color)' }}>
          {formatCurrency(Math.round(group.total))}
        </td>
      </tr>
    );
  };

  const renderSummaryRow = (label: string, values: number[], total: number, isBold: boolean, isFirst = false) => (
    <tr key={label}>
      <td
        colSpan={4}
        style={{
          ...cellBase,
          fontWeight: isBold ? 700 : 400,
          backgroundColor: 'var(--cui-secondary-bg)',
          position: 'sticky',
          left: 0,
          zIndex: 1,
          borderRight: '2px solid var(--cui-border-color)',
          borderTop: isFirst ? '3px double var(--cui-border-color)' : undefined,
        }}
      >
        {label}
      </td>
      {values.map((val, pi) => (
        <td
          key={aggPeriods[pi]?.id ?? pi}
          style={{
            ...numCell,
            fontWeight: isBold ? 700 : 400,
            backgroundColor: 'var(--cui-secondary-bg)',
            width: periodWidth,
            minWidth: periodWidth,
            color: val < 0 ? 'var(--cui-danger)' : 'var(--cui-body-color)',
            borderTop: isFirst ? '3px double var(--cui-border-color)' : undefined,
          }}
        >
          {formatCurrency(val)}
        </td>
      ))}
      <td style={{
        ...numCell,
        fontWeight: isBold ? 700 : 400,
        backgroundColor: 'var(--cui-secondary-bg)',
        width: totalWidth,
        minWidth: totalWidth,
        position: 'sticky',
        right: 0,
        zIndex: 1,
        borderLeft: '2px solid var(--cui-border-color)',
        borderTop: isFirst ? '3px double var(--cui-border-color)' : undefined,
      }}>
        {formatCurrency(Math.round(total))}
      </td>
    </tr>
  );

  const gprTotal = aggGpr.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Periodicity toggle */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['monthly', 'quarterly', 'annual'] as TimeScale[]).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setTimeScale(scale)}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.25rem',
                border: '1px solid',
                cursor: 'pointer',
                borderColor: timeScale === scale ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                backgroundColor: timeScale === scale ? 'var(--cui-primary)' : 'transparent',
                color: timeScale === scale ? 'white' : 'var(--cui-secondary-color)',
              }}
            >
              {scale.charAt(0).toUpperCase() + scale.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, backgroundColor: 'var(--cui-border-color)' }} />

        {/* Group by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)', fontWeight: 500 }}>Group by:</span>
          {([
            { value: 'unit' as GroupMode, label: 'Unit' },
            { value: 'plan_type' as GroupMode, label: 'Plan Type' },
            { value: 'bedrooms' as GroupMode, label: 'Bedrooms' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setGroupMode(value); setCollapsedGroups(new Set()); }}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.25rem',
                border: '1px solid',
                cursor: 'pointer',
                borderColor: groupMode === value ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                backgroundColor: groupMode === value ? 'var(--cui-primary)' : 'transparent',
                color: groupMode === value ? 'white' : 'var(--cui-secondary-color)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, backgroundColor: 'var(--cui-border-color)' }} />

        {/* Export CSV */}
        <button
          type="button"
          onClick={handleExportCSV}
          style={{
            padding: '0.25rem 0.625rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: '0.25rem',
            border: '1px solid var(--cui-border-color)',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: 'var(--cui-body-color)',
          }}
        >
          Export CSV
        </button>

        {/* Reconciliation badge */}
        {!data.reconciliation.ok && (
          <span
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.6875rem',
              fontWeight: 600,
              borderRadius: '0.25rem',
              backgroundColor: 'var(--cui-warning-bg)',
              color: 'var(--cui-warning)',
              border: '1px solid var(--cui-warning)',
            }}
          >
            GPR Mismatch
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          overflow: 'auto',
          border: '1px solid var(--cui-border-color)',
          borderRadius: '0.375rem',
          maxHeight: 'calc(100vh - 280px)',
        }}
      >
        <table
          style={{
            borderCollapse: 'collapse',
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          <thead>
            <tr>
              <th style={{ ...headerCell, width: labelWidth, minWidth: labelWidth, position: 'sticky', left: 0, zIndex: 3 }}>Unit #</th>
              <th style={{ ...headerCell, width: planWidth, minWidth: planWidth, position: 'sticky', left: labelWidth, zIndex: 3 }}>Plan / Type</th>
              <th style={{ ...headerCell, width: typeWidth, minWidth: typeWidth, position: 'sticky', left: labelWidth + planWidth, zIndex: 3 }}>Bd/Ba</th>
              <th style={{ ...headerCell, width: sfWidth, minWidth: sfWidth, textAlign: 'right', position: 'sticky', left: labelWidth + planWidth + typeWidth, zIndex: 3, borderRight: '2px solid var(--cui-border-color)' }}>SF</th>
              {aggPeriods.map((p) => (
                <th key={p.id} style={{ ...headerCell, width: periodWidth, minWidth: periodWidth, textAlign: 'right' }}>
                  {p.label}
                </th>
              ))}
              <th style={{ ...headerCell, width: totalWidth, minWidth: totalWidth, textAlign: 'right', position: 'sticky', right: 0, zIndex: 3, borderLeft: '2px solid var(--cui-border-color)' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {/* Unit rows */}
            {groupMode === 'unit' ? (
              data.units.map((unit) => renderUnitRow(unit))
            ) : (
              groups.map((group) => (
                <React.Fragment key={group.key}>
                  {renderGroupHeaderRow(group)}
                  {!collapsedGroups.has(group.key) &&
                    group.units.map((unit) => renderUnitRow(unit, true))}
                </React.Fragment>
              ))
            )}

            {/* Summary section */}
            {renderSummaryRow('Gross Potential Rent', aggGpr, gprTotal, true, true)}
            {aggSummaryRows.map((sr) =>
              renderSummaryRow(sr.label, sr.values, sr.total, sr.label === 'Net Rental Income')
            )}
          </tbody>
        </table>
      </div>

      {/* Unit count */}
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
        {data.units.length} units &middot; {aggPeriods.length} periods ({timeScale})
      </div>
    </div>
  );
}
