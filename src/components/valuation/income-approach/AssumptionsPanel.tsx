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
 * Session: QK-11, QK-22 (fixed CCollapse rendering issue)
 */

import React, { useState, useCallback } from 'react';
import type { AssumptionsPanelProps } from '@/types/income-approach';
import { formatCurrency } from '@/types/income-approach';

// Chevron icon component
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

// Lock icon for pulled values
function LockIcon() {
  return (
    <svg className="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function AssumptionsPanel({
  assumptions,
  rentRoll,
  operatingExpenses,
  onAssumptionChange,
  isSaving,
}: AssumptionsPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    income: true,
    expenses: true,
    capitalization: true,
    dcf: false,
  });

  // Define hooks before any conditional returns
  const toggleSection = useCallback((section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Guard against missing data
  if (!assumptions || !rentRoll || !operatingExpenses) {
    return (
      <div
        className="h-full overflow-y-auto p-4"
        style={{ backgroundColor: 'var(--cui-card-bg)' }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--cui-body-color)' }}
        >
          Assumptions
        </h2>
        <p style={{ color: 'var(--cui-secondary-color)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto pr-2"
      style={{ backgroundColor: 'var(--cui-card-bg)' }}
    >
      <div className="p-4">
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--cui-body-color)' }}
        >
          Assumptions
        </h2>

        {/* Saving indicator */}
        {isSaving && (
          <div
            className="text-xs mb-3 flex items-center gap-2"
            style={{ color: 'var(--cui-primary)' }}
          >
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Saving...
          </div>
        )}

        {/* Income Section */}
        <AccordionSection
          title="Income"
          isOpen={openSections.income}
          onToggle={() => toggleSection('income')}
        >
          <div className="space-y-3">
            {/* GPR - Pulled from rent roll */}
            <ReadOnlyField
              label="Gross Potential Rent"
              value={formatCurrency(rentRoll.forward_gpr)}
              tooltip="Pulled from rent roll (market rent x 12)"
            />

            {/* Vacancy Rate */}
            <PercentInput
              label="Vacancy Rate"
              value={assumptions.vacancy_rate}
              onChange={(v) => onAssumptionChange('vacancy_rate', v)}
              min={0}
              max={0.5}
            />

            {/* Stabilized Vacancy */}
            <PercentInput
              label="Stabilized Vacancy"
              value={assumptions.stabilized_vacancy_rate}
              onChange={(v) => onAssumptionChange('stabilized_vacancy_rate', v)}
              min={0}
              max={0.5}
              tooltip="Market-standard vacancy for stabilized NOI"
            />

            {/* Credit Loss */}
            <PercentInput
              label="Credit Loss"
              value={assumptions.credit_loss_rate}
              onChange={(v) => onAssumptionChange('credit_loss_rate', v)}
              min={0}
              max={0.2}
            />

            {/* Other Income */}
            <CurrencyInput
              label="Other Income"
              value={assumptions.other_income}
              onChange={(v) => onAssumptionChange('other_income', v)}
            />

            {/* Income Growth */}
            <PercentInput
              label="Income Growth Rate"
              value={assumptions.income_growth_rate}
              onChange={(v) => onAssumptionChange('income_growth_rate', v)}
              min={-0.1}
              max={0.2}
              tooltip="For DCF projections"
            />
          </div>
        </AccordionSection>

        {/* Expenses Section */}
        <AccordionSection
          title="Expenses"
          isOpen={openSections.expenses}
          onToggle={() => toggleSection('expenses')}
        >
          <div className="space-y-3">
            {/* OpEx - Pulled */}
            <ReadOnlyField
              label="Operating Expenses"
              value={formatCurrency(operatingExpenses.total)}
              tooltip="Pulled from Operations tab"
            />

            {/* Management Fee */}
            <PercentInput
              label="Management Fee"
              value={assumptions.management_fee_pct}
              onChange={(v) => onAssumptionChange('management_fee_pct', v)}
              min={0}
              max={0.15}
              tooltip="% of Effective Gross Income"
            />

            {/* Replacement Reserves */}
            <CurrencyInput
              label="Reserves/Unit"
              value={assumptions.replacement_reserves_per_unit}
              onChange={(v) => onAssumptionChange('replacement_reserves_per_unit', v)}
              suffix="/unit/year"
            />

            {/* Expense Growth */}
            <PercentInput
              label="Expense Growth Rate"
              value={assumptions.expense_growth_rate}
              onChange={(v) => onAssumptionChange('expense_growth_rate', v)}
              min={-0.1}
              max={0.2}
              tooltip="For DCF projections"
            />
          </div>
        </AccordionSection>

        {/* Capitalization Section */}
        <AccordionSection
          title="Capitalization"
          isOpen={openSections.capitalization}
          onToggle={() => toggleSection('capitalization')}
        >
          <div className="space-y-3">
            {/* Cap Rate */}
            <PercentInput
              label="Going-In Cap Rate"
              value={assumptions.selected_cap_rate}
              onChange={(v) => onAssumptionChange('selected_cap_rate', v)}
              min={0.01}
              max={0.15}
              step={0.0025}
            />

            {/* Cap Rate Method */}
            <SelectInput
              label="Cap Rate Method"
              value={assumptions.market_cap_rate_method}
              onChange={(v) => onAssumptionChange('market_cap_rate_method', v)}
              options={[
                { value: 'comp_sales', label: 'Comparable Sales' },
                { value: 'band_investment', label: 'Band of Investment' },
                { value: 'investor_survey', label: 'Investor Survey' },
                { value: 'other', label: 'Other' },
              ]}
            />

            {/* Cap Rate Interval */}
            <PercentInput
              label="Sensitivity Interval"
              value={assumptions.cap_rate_interval}
              onChange={(v) => onAssumptionChange('cap_rate_interval', v)}
              min={0.0025}
              max={0.01}
              step={0.0025}
              tooltip="Interval for sensitivity matrix"
            />
          </div>
        </AccordionSection>

        {/* DCF Parameters Section */}
        <AccordionSection
          title="DCF Parameters"
          isOpen={openSections.dcf}
          onToggle={() => toggleSection('dcf')}
        >
          <div className="space-y-3">
            {/* Hold Period */}
            <NumberInput
              label="Hold Period"
              value={assumptions.hold_period_years}
              onChange={(v) => onAssumptionChange('hold_period_years', v)}
              min={1}
              max={30}
              suffix="years"
            />

            {/* Discount Rate */}
            <PercentInput
              label="Discount Rate"
              value={assumptions.discount_rate}
              onChange={(v) => onAssumptionChange('discount_rate', v)}
              min={0.05}
              max={0.20}
            />

            {/* Exit Cap Rate */}
            <PercentInput
              label="Exit Cap Rate"
              value={assumptions.terminal_cap_rate}
              onChange={(v) => onAssumptionChange('terminal_cap_rate', v)}
              min={0.01}
              max={0.15}
            />

            {/* Discount Interval */}
            <PercentInput
              label="Discount Interval"
              value={assumptions.discount_rate_interval}
              onChange={(v) => onAssumptionChange('discount_rate_interval', v)}
              min={0.0025}
              max={0.01}
              step={0.0025}
              tooltip="For sensitivity matrix"
            />

            {/* Selling Costs */}
            <PercentInput
              label="Selling Costs"
              value={assumptions.selling_costs_pct}
              onChange={(v) => onAssumptionChange('selling_costs_pct', v)}
              min={0}
              max={0.10}
              tooltip="Broker fees, closing costs at exit"
            />
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
    <div
      className="mb-3 rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--cui-tertiary-bg)',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-left"
        style={{ color: 'var(--cui-body-color)' }}
      >
        <span className="font-medium text-sm">{title}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {/* QK-22: Replaced CCollapse with simple conditional - CCollapse had CSS conflicts */}
      {isOpen && (
        <div className="px-3 pb-3">{children}</div>
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

function ReadOnlyField({ label, value, tooltip }: ReadOnlyFieldProps) {
  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs flex items-center gap-1"
        style={{ color: 'var(--cui-secondary-color)' }}
        title={tooltip}
      >
        <LockIcon />
        {label}
      </label>
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--cui-body-color)' }}
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
  step?: number;
  tooltip?: string;
}

function PercentInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.0025,
  tooltip,
}: PercentInputProps) {
  const safeValue = value ?? 0;
  // Use local state for editing to allow intermediate values
  const [localValue, setLocalValue] = useState((safeValue * 100).toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value with prop when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue((safeValue * 100).toFixed(2));
    }
  }, [safeValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(localValue) / 100;
    if (!isNaN(numValue)) {
      // Clamp to valid range
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setLocalValue((clampedValue * 100).toFixed(2));
    } else {
      // Reset to current value if invalid
      setLocalValue((safeValue * 100).toFixed(2));
    }
  };

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs"
        style={{ color: 'var(--cui-secondary-color)' }}
        title={tooltip}
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          step={step * 100}
          min={min * 100}
          max={max * 100}
          className="w-16 px-2 py-1 text-right text-sm rounded"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)',
            border: '1px solid var(--cui-border-color)',
          }}
        />
        <span
          className="text-xs"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          %
        </span>
      </div>
    </div>
  );
}

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}

function CurrencyInput({ label, value, onChange, suffix }: CurrencyInputProps) {
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
    setLocalValue(e.target.value);
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

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <span
          className="text-xs"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          $
        </span>
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          min={0}
          className="w-20 px-2 py-1 text-right text-sm rounded"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)',
            border: '1px solid var(--cui-border-color)',
          }}
        />
        {suffix && (
          <span
            className="text-xs"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            {suffix}
          </span>
        )}
      </div>
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
    setLocalValue(e.target.value);
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

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          min={min}
          max={max}
          className="w-16 px-2 py-1 text-right text-sm rounded"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)',
            border: '1px solid var(--cui-border-color)',
          }}
        />
        {suffix && (
          <span
            className="text-xs"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            {suffix}
          </span>
        )}
      </div>
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
    <div className="flex items-center justify-between">
      <label
        className="text-xs"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {label}
      </label>
      <select
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-sm rounded"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
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

export default AssumptionsPanel;
