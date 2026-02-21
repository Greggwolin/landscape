'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CFormInput, CFormSelect } from '@coreui/react';
import { formatCurrency } from './types';
import type {
  CalculatedValues,
  ValueAddState,
  ValueAddStats,
  RenoCostBasis
} from '@/hooks/useValueAddAssumptions';

interface ValueAddCardProps {
  state: ValueAddState;
  calculated: CalculatedValues;
  stats: ValueAddStats;
  onUpdate: <K extends keyof ValueAddState>(key: K, value: ValueAddState[K]) => void;
  isLoading?: boolean;
  isSaving?: boolean;
}

/**
 * ValueAddCard - Two-panel value-add assumptions card
 *
 * Left panel: Input fields in two-column layout (self-documenting labels, inputs)
 * Right panel: Costs breakdown + Annual Impact summary (vertically stacked)
 */
export function ValueAddCard({
  state,
  calculated,
  stats,
  onUpdate,
  isLoading = false,
  isSaving = false
}: ValueAddCardProps) {
  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return formatCurrency(value);
  };

  return (
    <div className="ops-card">
      {/* Header row - matches other section headers */}
      <div className="ops-section-header">
        <div className="d-flex align-items-baseline gap-3" style={{ textAlign: 'left' }}>
          <h3 className="ops-section-title" style={{ margin: 0 }}>Value-Add Assumptions</h3>
          <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
            Configure renovation scope, costs, and timing. These assumptions drive the Post-Rehab column in the Operations tab.
          </span>
        </div>
        {isSaving && <span className="va-saving">Saving...</span>}
      </div>

      <div className="va-body">
        <div className="va-panel va-panel-assumptions">
          <div className="va-panel-header">
            <h4 className="va-section-title">Assumptions</h4>
          </div>
          <div className="va-panel-body" >
            <div className="va-inputs-panel">
              <EditableNumberRow
                label="Renovation Start Month"
                value={state.renoStartMonth}
                min={1}
                onSave={(val) => onUpdate('renoStartMonth', val)}
                disabled={isLoading}
              />
              <EditableNumberRow
                label="Reno Starts / Month"
                value={state.renoStartsPerMonth}
                min={1}
                onSave={(val) => onUpdate('renoStartsPerMonth', val)}
                disabled={isLoading}
              />
              <EditableNumberRow
                label="Months to Complete Reno"
                value={state.monthsToComplete}
                min={1}
                onSave={(val) => onUpdate('monthsToComplete', val)}
                disabled={isLoading}
              />
              <RenovationCostRow
                cost={state.renoCost}
                basis={state.renoCostBasis}
                onUpdateCost={(val) => onUpdate('renoCost', val)}
                onUpdateBasis={(val) => onUpdate('renoCostBasis', val)}
                disabled={isLoading}
              />
              <EditableNumberRow
                label="Relocation Incentive"
                value={state.relocationIncentive}
                formatter={(val) => formatCurrency(val)}
                prefix="$"
                min={0}
                onSave={(val) => onUpdate('relocationIncentive', val)}
                disabled={isLoading}
              />
              <EditableNumberRow
                label="Rent Premium %"
                value={state.rentPremiumPct}
                formatter={(val) => `${Math.round(val * 100)}`}
                parser={(input) => input / 100}
                inputFormatter={(val) => val * 100}
                min={0}
                max={100}
                onSave={(val) => onUpdate('rentPremiumPct', val)}
                disabled={isLoading}
              />
              <EditableNumberRow
                label="Relet Lag [Months]"
                value={state.reletMonths}
                min={0}
                onSave={(val) => onUpdate('reletMonths', val)}
                disabled={isLoading}
              />
              <UnitsToRenovateRow
                renovateAll={state.renovateAll}
                units={state.unitsToRenovate}
                totalUnits={stats.totalUnits}
                onUpdateRenovateAll={(flag) => onUpdate('renovateAll', flag)}
                onUpdateUnits={(val) => onUpdate('unitsToRenovate', val)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Middle Column: Costs + Annual Impact (stacked) */}
        <div className="va-summary-panel">
          <div className="va-panel">
            <div className="va-panel-header">
              <h4 className="va-section-title">Costs</h4>
            </div>
            <div className="va-panel-body" >
              <div className="va-section-rows">
                <div className="va-section-row">
                  <span className="va-section-label">Renovation</span>
                  <span className="va-section-value">{formatCompact(calculated.costs.renovation)}</span>
                </div>
                <div className="va-section-row">
                  <span className="va-section-label">Relocation</span>
                  <span className="va-section-value">{formatCompact(calculated.costs.relocation)}</span>
                </div>
                <div className="va-section-row">
                  <span className="va-section-label">Vacancy Loss</span>
                  <span className="va-section-value">{formatCompact(calculated.costs.vacancyLoss)}</span>
                </div>
                <div className="va-section-row va-section-row-total">
                  <span className="va-section-label">Total</span>
                  <span className="va-section-value">{formatCompact(calculated.costs.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="va-panel">
            <div className="va-panel-header">
              <h4 className="va-section-title">Annual Impact (Stabilized)</h4>
            </div>
            <div className="va-panel-body" >
              <div className="va-section-rows">
                <div className="va-section-row">
                  <span className="va-section-label">Gross Revenue</span>
                  <span className="va-section-value va-positive">+{formatCompact(calculated.annualImpact.grossRevenue)}</span>
                </div>
                <div className="va-section-row">
                  <span className="va-section-label">Expenses</span>
                  <span className="va-section-value va-negative">-{formatCompact(calculated.annualImpact.expenses)}</span>
                </div>
                <div className="va-section-row va-section-row-total">
                  <span className="va-section-label">NOI Increase</span>
                  <span className="va-section-value va-positive">+{formatCompact(calculated.annualImpact.noi)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="va-metrics">
            <div className="va-metric">
              <span className="va-metric-value">{formatCurrency(calculated.costPerUnit)}</span>
              <span className="va-metric-label">Cost/Unit</span>
            </div>
            <div className="va-metric">
              <span className="va-metric-value">{calculated.programDurationMonths}</span>
              <span className="va-metric-label">Program Mo</span>
            </div>
            <div className="va-metric">
              <span className="va-metric-value">{calculated.simplePaybackMonths}</span>
              <span className="va-metric-label">Payback Mo</span>
            </div>
          </div>
        </div>

        {/* Right Column: Treemap with Legend */}
        <div className="va-panel va-panel-graphic">
          <div className="va-panel-header">
            <h4 className="va-section-title">Cost Breakdown</h4>
          </div>
          <div className="va-panel-body va-graphic-panel" >
            {/* Treemap */}
            <div className="va-treemap">
              <div
                className="va-treemap-cell va-treemap-reno"
                style={{
                  flexBasis: `${calculated.costs.total > 0 ? (calculated.costs.renovation / calculated.costs.total) * 100 : 33}%`,
                  background: '#05AB3F'
                }}
              >
                <span className="va-treemap-label">Renovation</span>
                <span className="va-treemap-value">{formatCompact(calculated.costs.renovation)}</span>
                <span className="va-treemap-pct">{calculated.costs.total > 0 ? Math.round((calculated.costs.renovation / calculated.costs.total) * 100) : 0}%</span>
              </div>
              <div className="va-treemap-right">
                <div
                  className="va-treemap-cell"
                  style={{
                    flexBasis: `${(calculated.costs.relocation + calculated.costs.vacancyLoss) > 0 ? (calculated.costs.relocation / (calculated.costs.relocation + calculated.costs.vacancyLoss)) * 100 : 50}%`,
                    background: '#EA1846'
                  }}
                >
                  <span className="va-treemap-label">Relocation</span>
                  <span className="va-treemap-value">{formatCompact(calculated.costs.relocation)}</span>
                  <span className="va-treemap-pct">{calculated.costs.total > 0 ? Math.round((calculated.costs.relocation / calculated.costs.total) * 100) : 0}%</span>
                </div>
                <div
                  className="va-treemap-cell"
                  style={{
                    flexBasis: `${(calculated.costs.relocation + calculated.costs.vacancyLoss) > 0 ? (calculated.costs.vacancyLoss / (calculated.costs.relocation + calculated.costs.vacancyLoss)) * 100 : 50}%`,
                    background: '#059DDF'
                  }}
                >
                  <span className="va-treemap-label">Vacancy</span>
                  <span className="va-treemap-value">{formatCompact(calculated.costs.vacancyLoss)}</span>
                  <span className="va-treemap-pct">{calculated.costs.total > 0 ? Math.round((calculated.costs.vacancyLoss / calculated.costs.total) * 100) : 0}%</span>
                </div>
              </div>
            </div>
            {/* Total */}
            <div className="va-graphic-total">
              <span className="va-graphic-total-label">Total Program Cost</span>
              <span className="va-graphic-total-value">{formatCompact(calculated.costs.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditableNumberRowProps {
  label: string;
  value: number | null | undefined;
  onSave: (value: number) => void;
  formatter?: (value: number) => string;
  parser?: (input: number) => number;
  inputFormatter?: (value: number) => number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  displayValue?: string;
  disabled?: boolean;
}

function EditableNumberRow({
  label,
  value,
  onSave,
  formatter,
  parser,
  inputFormatter,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  displayValue,
  disabled = false,
}: EditableNumberRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formatInput = (nextValue?: number | null) => {
    if (nextValue === null || nextValue === undefined || Number.isNaN(nextValue)) {
      return '';
    }
    const normalized = inputFormatter ? inputFormatter(nextValue) : nextValue;
    return normalized.toString();
  };

  const parseDraft = (text: string) => {
    if (!text) return null;
    const parsed = parseFloat(text);
    if (Number.isNaN(parsed)) return null;
    return parser ? parser(parsed) : parsed;
  };

  const formatDisplay = () => {
    if (displayValue) return displayValue;
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (formatter) return formatter(value);
    return value.toString();
  };

  useEffect(() => {
    setDraft(formatInput(value));
  }, [value, inputFormatter]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    const parsed = parseDraft(draft);
    if (parsed !== null) {
      onSave(parsed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(formatInput(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleRowClick = () => {
    if (disabled) return;
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  return (
    <div className="va-field-row" onClick={handleRowClick}>
      <span className="va-field-label">{label}</span>
      <div className="va-field-value-container" onMouseDown={(e) => e.stopPropagation()}>
        {isEditing ? (
          <div className="va-field-editor">
            {prefix && <span className="va-field-prefix">{prefix}</span>}
            <CFormInput
              size="sm"
              type="number"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              ref={inputRef}
              className="va-field-input"
            />
            {suffix && <span className="va-field-suffix">{suffix}</span>}
          </div>
        ) : (
          <span className={`va-field-value ${formatDisplay() === '—' ? 'empty' : ''}`}>{formatDisplay()}</span>
        )}
      </div>
    </div>
  );
}

interface RenovationCostRowProps {
  cost: number | null;
  basis: RenoCostBasis;
  onUpdateCost: (value: number) => void;
  onUpdateBasis: (value: RenoCostBasis) => void;
  disabled?: boolean;
}

function RenovationCostRow({
  cost,
  basis,
  onUpdateCost,
  onUpdateBasis,
  disabled = false,
}: RenovationCostRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftCost, setDraftCost] = useState(cost !== null ? cost.toString() : '');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftCost(cost !== null ? cost.toString() : '');
  }, [cost]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommitAndClose = () => {
    const parsed = parseFloat(draftCost);
    if (!Number.isNaN(parsed)) {
      onUpdateCost(parsed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftCost(cost !== null ? cost.toString() : '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleRowClick = () => {
    if (disabled) return;
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  // Close editor when clicking outside
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const parsed = parseFloat(draftCost);
        if (!Number.isNaN(parsed)) {
          onUpdateCost(parsed);
        }
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, draftCost, onUpdateCost]);

  const displayValue = cost !== null ? `${formatCurrency(cost)} /${basis === 'sf' ? 'SF' : 'Unit'}` : '—';

  return (
    <div className="va-field-row" onClick={handleRowClick} ref={containerRef}>
      <span className="va-field-label">Renovation Cost</span>
      <div className="va-field-value-container" onMouseDown={(e) => e.stopPropagation()}>
        {!isEditing ? (
          <span className={`va-field-value ${cost === null ? 'empty' : ''}`}>{displayValue}</span>
        ) : (
          <div className="va-cost-editor">
            <div className="va-basis-toggle">
              <button
                type="button"
                className={`va-basis-btn ${basis === 'sf' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBasis('sf');
                }}
                disabled={disabled}
              >
                /SF
              </button>
              <button
                type="button"
                className={`va-basis-btn ${basis === 'unit' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBasis('unit');
                }}
                disabled={disabled}
              >
                /Unit
              </button>
            </div>
            <div className="va-field-editor">
              <span className="va-field-prefix">$</span>
              <CFormInput
                size="sm"
                type="number"
                inputMode="decimal"
                value={draftCost}
                onChange={(e) => setDraftCost(e.target.value)}
                onKeyDown={handleKeyDown}
                min={0}
                step={0.5}
                disabled={disabled}
                ref={inputRef}
                className="va-field-input"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface UnitsToRenovateRowProps {
  renovateAll: boolean;
  units: number | null;
  totalUnits: number;
  onUpdateRenovateAll: (value: boolean) => void;
  onUpdateUnits: (value: number | null) => void;
  disabled?: boolean;
}

function UnitsToRenovateRow({
  renovateAll,
  units,
  totalUnits,
  onUpdateRenovateAll,
  onUpdateUnits,
  disabled = false,
}: UnitsToRenovateRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState(renovateAll ? 'all' : 'custom');
  const [draftUnits, setDraftUnits] = useState(units?.toString() ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(renovateAll ? 'all' : 'custom');
    setDraftUnits(units?.toString() ?? '');
  }, [renovateAll, units]);

  useEffect(() => {
    if (isEditing && mode === 'custom' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, mode]);

  const handleRowClick = () => {
    if (disabled) return;
    setIsEditing(true);
  };

  const handleModeChange = (selected: 'all' | 'custom') => {
    setMode(selected);
    if (selected === 'all') {
      onUpdateRenovateAll(true);
      onUpdateUnits(null);
      setIsEditing(false);
    } else {
      onUpdateRenovateAll(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  };

  const handleCommitAndClose = () => {
    if (mode === 'custom') {
      const parsed = parseInt(draftUnits) || 0;
      if (parsed > 0) {
        const clamped = Math.min(parsed, totalUnits || parsed);
        onUpdateUnits(clamped);
      }
    }
    setIsEditing(false);
  };

  // Close editor when clicking outside
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Inline the commit logic to avoid stale closure
        if (mode === 'custom') {
          const parsed = parseInt(draftUnits) || 0;
          if (parsed > 0) {
            const clamped = Math.min(parsed, totalUnits || parsed);
            onUpdateUnits(clamped);
          }
        }
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, mode, draftUnits, totalUnits, onUpdateUnits]);

  const handleCancel = () => {
    setDraftUnits(units?.toString() ?? '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = renovateAll ? 'All' : units?.toString() ?? '—';

  return (
    <div className="va-field-row" onClick={handleRowClick} ref={containerRef}>
      <span className="va-field-label">Units to Renovate</span>
      <div className="va-field-value-container" onMouseDown={(e) => e.stopPropagation()}>
        {!isEditing ? (
          <span className={`va-field-value ${displayValue === '—' ? 'empty' : ''}`}>{displayValue}</span>
        ) : (
          <div className="va-units-editor">
            <CFormSelect
              size="sm"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as 'all' | 'custom')}
              disabled={disabled}
              className="va-field-select"
            >
              <option value="all">All</option>
              <option value="custom">Custom</option>
            </CFormSelect>
            {mode === 'custom' && (
              <CFormInput
                size="sm"
                type="number"
                min={1}
                max={totalUnits || undefined}
                value={draftUnits}
                onChange={(e) => setDraftUnits(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                ref={inputRef}
                className="va-field-input"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ValueAddCard;
