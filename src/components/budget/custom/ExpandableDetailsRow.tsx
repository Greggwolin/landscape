// ExpandableDetailsRow - Shows additional budget item fields in accordion pattern
// v1.1 · 2025-11-10 · Compact always-visible inputs with color indicators

'use client';

import React, { useState, useEffect } from 'react';
import type { BudgetItem } from '../ColumnDefinitions';
import type { BudgetMode } from '../ModeSelector';

interface ExpandableDetailsRowProps {
  item: BudgetItem;
  mode: BudgetMode;
  columnCount: number;
  onInlineCommit?: (
    item: BudgetItem,
    field: keyof BudgetItem,
    value: unknown
  ) => Promise<void> | void;
}

interface FieldConfig {
  key: keyof BudgetItem;
  label: string;
  type: 'number' | 'text' | 'boolean';
}

export default function ExpandableDetailsRow({
  item,
  mode,
  columnCount,
  onInlineCommit,
}: ExpandableDetailsRowProps) {
  // Don't show for napkin mode
  if (mode === 'napkin') return null;

  // Define fields to show based on mode
  const standardFields: FieldConfig[] = [
    { key: 'start_period', label: 'Start Period', type: 'number' },
    { key: 'periods_to_complete', label: 'Duration', type: 'number' },
    { key: 'escalation_rate', label: 'Escalation %', type: 'number' },
    { key: 'contingency_pct', label: 'Contingency %', type: 'number' },
    { key: 'timing_method', label: 'Timing', type: 'text' },
    { key: 'vendor_name', label: 'Vendor', type: 'text' },
  ];

  const detailOnlyFields: FieldConfig[] = [
    { key: 'start_date', label: 'Start Date', type: 'text' },
    { key: 'end_date', label: 'End Date', type: 'text' },
    { key: 'funding_id', label: 'Funding', type: 'number' },
    { key: 'curve_id', label: 'Curve', type: 'number' },
    { key: 'milestone_id', label: 'Milestone', type: 'number' },
    { key: 'cf_start_flag', label: 'CF Start', type: 'boolean' },
  ];

  const fieldsToShow = mode === 'detail'
    ? [...standardFields, ...detailOnlyFields]
    : standardFields;

  // Color indicator based on mode
  const indicatorColor = mode === 'standard' ? '#ffc107' : '#dc3545'; // Yellow for Standard, Red for Detail

  return (
    <>
      {/* Standard fields row - shown in Standard and Detail modes */}
      <tr className="expandable-details-row">
        <td colSpan={columnCount} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--cui-table-bg)' }}>
          <div className="d-flex align-items-center gap-2">
            {/* Yellow indicator for Standard fields */}
            <div
              style={{
                width: '4px',
                height: '24px',
                backgroundColor: '#ffc107',
                borderRadius: '2px',
                flexShrink: 0,
              }}
              title="Standard fields"
            />
            <div className="d-flex align-items-center gap-3 flex-wrap flex-grow-1">
              {standardFields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  item={item}
                  onInlineCommit={onInlineCommit}
                />
              ))}
            </div>
          </div>
        </td>
      </tr>

      {/* Detail-only fields row - shown only in Detail mode */}
      {mode === 'detail' && (
        <tr className="expandable-details-row">
          <td colSpan={columnCount} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--cui-table-bg)' }}>
            <div className="d-flex align-items-center gap-2">
              {/* Red indicator for Detail fields */}
              <div
                style={{
                  width: '4px',
                  height: '24px',
                  backgroundColor: '#dc3545',
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
                title="Detail fields"
              />
              <div className="d-flex align-items-center gap-3 flex-wrap flex-grow-1">
                {detailOnlyFields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    item={item}
                    onInlineCommit={onInlineCommit}
                  />
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Separate component for each field input
function FieldInput({
  field,
  item,
  onInlineCommit,
}: {
  field: FieldConfig;
  item: BudgetItem;
  onInlineCommit?: (item: BudgetItem, field: keyof BudgetItem, value: unknown) => Promise<void> | void;
}) {
  const [value, setValue] = useState<string | number | boolean>(() => {
    const itemValue = item[field.key];
    if (field.type === 'boolean') {
      return Boolean(itemValue);
    }
    return itemValue ?? '';
  });

  // Update local state when item prop changes
  useEffect(() => {
    const itemValue = item[field.key];
    if (field.type === 'boolean') {
      setValue(Boolean(itemValue));
    } else {
      setValue(itemValue ?? '');
    }
  }, [item, field.key, field.type]);

  const handleBlur = async () => {
    if (!onInlineCommit) return;

    let commitValue: unknown = value;

    if (field.type === 'number') {
      commitValue = value === '' ? null : Number(value);
    } else if (field.type === 'text') {
      commitValue = value === '' ? null : String(value);
    }

    // Only commit if value changed
    const itemValue = item[field.key];
    if (commitValue !== itemValue) {
      await onInlineCommit(item, field.key, commitValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  if (field.type === 'boolean') {
    return (
      <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.875rem' }}>
        <label className="form-label mb-0 text-secondary" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {field.label}:
        </label>
        <input
          type="checkbox"
          className="form-check-input mt-0"
          checked={Boolean(value)}
          onChange={(e) => {
            const newValue = e.target.checked;
            setValue(newValue);
            if (onInlineCommit) {
              onInlineCommit(item, field.key, newValue);
            }
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.875rem' }}>
      <label className="form-label mb-0 text-secondary" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
        {field.label}:
      </label>
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        className="form-control form-control-sm"
        value={value}
        onChange={(e) => setValue(field.type === 'number' ? e.target.value : e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: field.type === 'number' ? '80px' : '120px',
          fontSize: '0.875rem',
          padding: '0.25rem 0.5rem',
        }}
      />
    </div>
  );
}
