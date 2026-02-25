'use client';

/**
 * AssumptionsPanel Component
 *
 * Left panel (30% width) with collapsible accordion sections for:
 * - Income Assumptions
 * - Expense Assumptions
 * - Capitalization Parameters
 * - DCF Parameters
 *
 * Session: QK-11, QK-22 (fixed CCollapse rendering issue), QX (formatting restore)
 */

import React, { useState, useCallback } from 'react';
import type { AssumptionsPanelProps } from '@/types/income-approach';
import { formatCurrency } from '@/types/income-approach';

// Chevron icon component
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      style={{
        width: '1rem',
        height: '1rem',
        transition: 'transform 0.2s',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// Consistent input width for alignment
const INPUT_STYLE: React.CSSProperties = { width: '6rem', flexShrink: 0 };
const SELECT_STYLE: React.CSSProperties = { width: '7.5rem', flexShrink: 0 };

interface ExtendedAssumptionsPanelProps extends AssumptionsPanelProps {
  activeMethod?: 'direct_cap' | 'dcf';
  onMethodChange?: (method: 'direct_cap' | 'dcf') => void;
}

export function AssumptionsPanel({
  assumptions,
  rentRoll,
  operatingExpenses,
  onAssumptionChange,
  isSaving,
  activeMethod = 'direct_cap',
  onMethodChange,
}: ExtendedAssumptionsPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    income: true,
    expenses: true,
    capitalization: true,
    dcf: true,
  });

  // Define hooks before any conditional returns
  const toggleSection = useCallback((section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Guard against missing data
  if (!assumptions || !rentRoll || !operatingExpenses) {
    return (
      <div
        style={{ height: '100%', overflowY: 'auto', padding: '1rem', backgroundColor: 'var(--cui-card-bg)' }}
      >
        <h2
          style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--cui-body-color)' }}
        >
          Assumptions
        </h2>
        <p style={{ color: 'var(--cui-secondary-color)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--cui-card-bg)' }}
    >
      {/* Main header - canonical card header background */}
      <div
        style={{
          padding: '0.375rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--cui-card-header-bg)',
          borderBottom: '1px solid var(--cui-border-color)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--cui-body-color)',
          }}
        >
          Assumptions
        </h2>

        {/* Method toggle + saving indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={() => onMethodChange?.('direct_cap')}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '0.25rem',
              border: '1px solid',
              cursor: 'pointer',
              borderColor: activeMethod === 'direct_cap' ? 'var(--cui-primary)' : 'var(--cui-border-color)',
              backgroundColor: activeMethod === 'direct_cap' ? 'var(--cui-primary)' : 'transparent',
              color: activeMethod === 'direct_cap' ? 'white' : 'var(--cui-secondary-color)',
            }}
          >
            Direct Cap
          </button>
          <button
            type="button"
            onClick={() => onMethodChange?.('dcf')}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '0.25rem',
              border: '1px solid',
              cursor: 'pointer',
              borderColor: activeMethod === 'dcf' ? 'var(--cui-primary)' : 'var(--cui-border-color)',
              backgroundColor: activeMethod === 'dcf' ? 'var(--cui-primary)' : 'transparent',
              color: activeMethod === 'dcf' ? 'white' : 'var(--cui-secondary-color)',
            }}
          >
            Cash Flow
          </button>

          {isSaving && (
            <div
              style={{
                marginLeft: '0.25rem',
                width: '0.75rem',
                height: '0.75rem',
                border: '2px solid var(--cui-primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* Sections - no horizontal padding so headers span full width */}
      <div style={{ paddingBottom: '1rem' }}>
        {/* Income Section */}
        <AccordionSection
          title="Income"
          isOpen={openSections.income}
          onToggle={() => toggleSection('income')}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AssumptionRow>
              <ReadOnlyField
                label="Gross Potential Rent"
                value={formatCurrency(rentRoll.forward_gpr)}
                tooltip="Pulled from rent roll (market rent x 12)"
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Vacancy Rate"
                value={assumptions.vacancy_rate}
                onChange={(v) => onAssumptionChange('vacancy_rate', v)}
                min={0}
                max={0.5}
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Stabilized Vacancy"
                value={assumptions.stabilized_vacancy_rate}
                onChange={(v) =>
                  onAssumptionChange('stabilized_vacancy_rate', v)
                }
                min={0}
                max={0.5}
                tooltip="Market-standard vacancy for stabilized NOI"
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Credit Loss"
                value={assumptions.credit_loss_rate}
                onChange={(v) => onAssumptionChange('credit_loss_rate', v)}
                min={0}
                max={0.2}
              />
            </AssumptionRow>

            <AssumptionRow>
              <CurrencyInput
                label="Other Income"
                value={assumptions.other_income}
                onChange={(v) => onAssumptionChange('other_income', v)}
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Income Growth Rate"
                value={assumptions.income_growth_rate}
                onChange={(v) => onAssumptionChange('income_growth_rate', v)}
                min={-0.1}
                max={0.2}
                tooltip="For DCF projections"
              />
            </AssumptionRow>
          </div>
        </AccordionSection>

        {/* Expenses Section */}
        <AccordionSection
          title="Expenses"
          isOpen={openSections.expenses}
          onToggle={() => toggleSection('expenses')}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AssumptionRow>
              <ReadOnlyField
                label="Operating Expenses"
                value={formatCurrency(operatingExpenses.total)}
                tooltip="Pulled from Operations tab"
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Management Fee"
                value={assumptions.management_fee_pct}
                onChange={(v) => onAssumptionChange('management_fee_pct', v)}
                min={0}
                max={0.15}
                tooltip="% of Effective Gross Income"
              />
            </AssumptionRow>

            <AssumptionRow>
              <CurrencyInput
                label="Reserves/Unit/Yr"
                value={assumptions.replacement_reserves_per_unit}
                onChange={(v) =>
                  onAssumptionChange('replacement_reserves_per_unit', v)
                }
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Expense Growth Rate"
                value={assumptions.expense_growth_rate}
                onChange={(v) => onAssumptionChange('expense_growth_rate', v)}
                min={-0.1}
                max={0.2}
                tooltip="For DCF projections"
              />
            </AssumptionRow>
          </div>
        </AccordionSection>

        {/* Capitalization Section */}
        <AccordionSection
          title="Capitalization"
          isOpen={openSections.capitalization}
          onToggle={() => toggleSection('capitalization')}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AssumptionRow>
              <PercentInput
                label="Going-In Cap Rate"
                value={assumptions.selected_cap_rate}
                onChange={(v) => onAssumptionChange('selected_cap_rate', v)}
                min={0.01}
                max={0.15}
              />
            </AssumptionRow>

            <AssumptionRow>
              <SelectInput
                label="Method"
                value={assumptions.market_cap_rate_method}
                onChange={(v) => onAssumptionChange('market_cap_rate_method', v)}
                options={[
                  { value: 'comp_sales', label: 'Comp Sales' },
                  { value: 'band_investment', label: 'Band' },
                  { value: 'investor_survey', label: 'Survey' },
                ]}
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Sensitivity Interval"
                value={assumptions.cap_rate_interval}
                onChange={(v) => onAssumptionChange('cap_rate_interval', v)}
                min={0.0025}
                max={0.01}
                tooltip="Interval for sensitivity matrix"
              />
            </AssumptionRow>
          </div>
        </AccordionSection>

        {/* DCF Parameters Section */}
        <AccordionSection
          title="DCF Parameters"
          isOpen={openSections.dcf}
          onToggle={() => toggleSection('dcf')}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AssumptionRow>
              <NumberInput
                label="Hold Period"
                value={assumptions.hold_period_years}
                onChange={(v) => onAssumptionChange('hold_period_years', v)}
                min={1}
                max={30}
                suffix="yrs"
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Discount Rate"
                value={assumptions.discount_rate}
                onChange={(v) => onAssumptionChange('discount_rate', v)}
                min={0.05}
                max={0.20}
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Exit Cap Rate"
                value={assumptions.terminal_cap_rate}
                onChange={(v) => onAssumptionChange('terminal_cap_rate', v)}
                min={0.01}
                max={0.15}
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Discount Interval"
                value={assumptions.discount_rate_interval}
                onChange={(v) => onAssumptionChange('discount_rate_interval', v)}
                min={0.0025}
                max={0.01}
                tooltip="For sensitivity matrix"
              />
            </AssumptionRow>

            <AssumptionRow>
              <PercentInput
                label="Selling Costs"
                value={assumptions.selling_costs_pct}
                onChange={(v) => onAssumptionChange('selling_costs_pct', v)}
                min={0}
                max={0.10}
                tooltip="Broker fees, closing costs at exit"
              />
            </AssumptionRow>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}

// ============================================================================
// ACCORDION SECTION
// ============================================================================

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ title, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div>
      {/* Section header - shaded background spanning full width */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          color: 'var(--cui-body-color)',
          background: 'var(--cui-card-subheader-bg)',
          border: 'none',
          borderTop: '1px solid var(--cui-border-color)',
          borderBottom: '1px solid var(--cui-border-color)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {/* QK-22: Replaced CCollapse with simple conditional - CCollapse had CSS conflicts */}
      {isOpen && (
        <div style={{ padding: '0.5rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{children}</div>
      )}
    </div>
  );
}

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  tooltip?: string;
}

// ReadOnlyField - NO lock icon, just plain text aligned with inputs
function ReadOnlyField({ label, value, tooltip }: ReadOnlyFieldProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <label
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--cui-secondary-color)',
        }}
        title={tooltip || label}
      >
        {label}
      </label>
      <span
        style={{
          ...INPUT_STYLE,
          textAlign: 'right',
          paddingRight: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--cui-body-color)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface PercentInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  tooltip?: string;
}

// PercentInput - % INSIDE the input box
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
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue((safeValue * 100).toFixed(2));
    }
  }, [safeValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip % and non-numeric chars except decimal and minus
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

  // Show % inside box when not focused
  const displayValue = isFocused ? localValue : `${localValue}%`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <label
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--cui-secondary-color)',
        }}
        title={tooltip || label}
      >
        {label}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        style={{
          ...INPUT_STYLE,
          padding: '1px 0.5rem',
          textAlign: 'right',
          fontSize: '0.875rem',
          borderRadius: '0.25rem',
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
        }}
      />
    </div>
  );
}

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

// CurrencyInput - $ INSIDE the input box
function CurrencyInput({ label, value, onChange }: CurrencyInputProps) {
  const safeValue = value ?? 0;
  const [localValue, setLocalValue] = useState(String(safeValue));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value with prop when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(safeValue));
    }
  }, [safeValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip $ and non-numeric chars except decimal
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    setLocalValue(rawValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(localValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
      setLocalValue(String(numValue));
    } else {
      setLocalValue(String(safeValue));
    }
  };

  // Show $ inside box when not focused
  const displayValue = isFocused ? localValue : `$${localValue}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <label
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--cui-secondary-color)',
        }}
        title={label}
      >
        {label}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        style={{
          ...INPUT_STYLE,
          padding: '1px 0.5rem',
          textAlign: 'right',
          fontSize: '0.875rem',
          borderRadius: '0.25rem',
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
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

// NumberInput - suffix INSIDE the input box (e.g., "10 yrs")
function NumberInput({ label, value, onChange, min = 0, max = 100, suffix }: NumberInputProps) {
  const safeValue = value ?? 0;
  const [localValue, setLocalValue] = useState(String(safeValue));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value with prop when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(safeValue));
    }
  }, [safeValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-numeric chars
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

  // Show suffix inside box when not focused (e.g., "10 yrs")
  const displayValue = isFocused ? localValue : (suffix ? `${localValue} ${suffix}` : localValue);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <label
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--cui-secondary-color)',
        }}
        title={label}
      >
        {label}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        style={{
          ...INPUT_STYLE,
          padding: '1px 0.5rem',
          textAlign: 'right',
          fontSize: '0.875rem',
          borderRadius: '0.25rem',
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
        }}
      />
    </div>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  const safeValue = value ?? options[0]?.value ?? '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <label
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--cui-secondary-color)',
        }}
        title={label}
      >
        {label}
      </label>
      <select
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...SELECT_STYLE,
          padding: '1px 0.5rem',
          fontSize: '0.875rem',
          borderRadius: '0.25rem',
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface AssumptionRowProps {
  children: React.ReactNode;
}

function AssumptionRow({ children }: AssumptionRowProps) {
  return (
    <div style={{ paddingTop: '2px', paddingBottom: '2px' }}>{children}</div>
  );
}

export default AssumptionsPanel;
