'use client';

/**
 * DCF Parameters Section
 *
 * Shared section for DCF parameters used by both CRE and Land Dev.
 * Reads/writes to tbl_dcf_analysis via useDcfAnalysis hook.
 *
 * Fields:
 * - Hold Period (years)
 * - Discount Rate (%)
 * - Exit Cap Rate (%)
 * - Selling Costs (%)
 * - Sensitivity Interval (CRE only)
 *
 * Session: QK-28
 */

import React, { useState, useEffect } from 'react';
import type { DcfAnalysis, PropertyType } from '@/types/dcf-analysis';

// ============================================================================
// CONSTANTS
// ============================================================================

const INPUT_WIDTH = 'w-[80px]';
const INPUT_CLASSES = 'px-1.5 py-0.5 text-right text-xs rounded';

// ============================================================================
// CHEVRON ICON
// ============================================================================

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

interface DcfParametersSectionProps {
  data?: DcfAnalysis;
  onChange: (field: keyof DcfAnalysis, value: number | null) => void;
  propertyType: PropertyType;
  defaultOpen?: boolean;
}

export function DcfParametersSection({
  data,
  onChange,
  propertyType,
  defaultOpen = false,
}: DcfParametersSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isCre = propertyType === 'cre';

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full d-flex justify-content-between align-items-center text-left"
        style={{
          background: 'var(--cui-tertiary-bg)',
          padding: '0.5rem 0.75rem',
          borderRadius: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
          DCF Parameters
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="pt-2 px-3 pb-2 space-y-2">
          {/* Hold Period */}
          <NumberInput
            label="Hold Period"
            value={data?.hold_period_years}
            onChange={(v) => onChange('hold_period_years', v)}
            min={1}
            max={30}
            suffix="yrs"
          />

          {/* Discount Rate */}
          <PercentInput
            label="Discount Rate"
            value={data?.discount_rate}
            onChange={(v) => onChange('discount_rate', v)}
            min={0.01}
            max={0.30}
          />

          {/* Exit Cap Rate */}
          <PercentInput
            label="Exit Cap Rate"
            value={data?.exit_cap_rate}
            onChange={(v) => onChange('exit_cap_rate', v)}
            min={0.01}
            max={0.20}
          />

          {/* Sensitivity Interval (CRE only) */}
          {isCre && (
            <PercentInput
              label="Sensitivity Interval"
              value={data?.sensitivity_interval}
              onChange={(v) => onChange('sensitivity_interval', v)}
              min={0.0025}
              max={0.02}
              tooltip="For sensitivity matrix"
            />
          )}

          {/* Selling Costs */}
          <PercentInput
            label="Selling Costs"
            value={data?.selling_costs_pct}
            onChange={(v) => onChange('selling_costs_pct', v)}
            min={0}
            max={0.10}
            tooltip="Broker fees, closing costs at exit"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

interface PercentInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  tooltip?: string;
}

function PercentInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  tooltip,
}: PercentInputProps) {
  const safeValue = value ?? 0;
  const [localValue, setLocalValue] = useState((safeValue * 100).toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value with prop when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue((safeValue * 100).toFixed(2));
    }
  }, [safeValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.-]/g, '');
    setLocalValue(rawValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(localValue) / 100;
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setLocalValue((clampedValue * 100).toFixed(2));
    } else {
      setLocalValue((safeValue * 100).toFixed(2));
    }
  };

  const displayValue = isFocused ? localValue : `${localValue}%`;

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs whitespace-nowrap"
        style={{ color: 'var(--cui-secondary-color)' }}
        title={tooltip}
      >
        {label}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={`${INPUT_WIDTH} ${INPUT_CLASSES}`}
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
        }}
      />
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

function NumberInput({ label, value, onChange, min = 0, max = 100, suffix }: NumberInputProps) {
  const safeValue = value ?? 0;
  const [localValue, setLocalValue] = useState(String(safeValue));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(safeValue));
    }
  }, [safeValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setLocalValue(rawValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseInt(localValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setLocalValue(String(clampedValue));
    } else {
      setLocalValue(String(safeValue));
    }
  };

  const formatDisplayValue = () => {
    if (isFocused) return localValue;
    const suffixText = suffix ? ` ${suffix}` : '';
    return `${localValue}${suffixText}`;
  };

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs whitespace-nowrap"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {label}
      </label>
      <input
        type="text"
        value={formatDisplayValue()}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={`${INPUT_WIDTH} ${INPUT_CLASSES}`}
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
        }}
      />
    </div>
  );
}

export default DcfParametersSection;
