'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from './types';
import type { CalculatedValues, ValueAddState, ValueAddStats } from '@/hooks/useValueAddAssumptions';

interface ValueAddCardProps {
  isEnabled: boolean;
  state: ValueAddState;
  calculated: CalculatedValues;
  stats: ValueAddStats;
  onToggle: () => void;
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
  isEnabled,
  state,
  calculated,
  stats,
  onToggle,
  onUpdate,
  isLoading = false,
  isSaving = false
}: ValueAddCardProps) {
  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return formatCurrency(value);
  };

  // Format number with commas for display
  const formatWithCommas = (value: number) => {
    return value.toLocaleString('en-US');
  };

  const handleNumberInput = (
    key: keyof ValueAddState,
    e: React.ChangeEvent<HTMLInputElement>,
    transform?: (val: number) => number
  ) => {
    const raw = parseFloat(e.target.value) || 0;
    const value = transform ? transform(raw) : raw;
    onUpdate(key, value as ValueAddState[typeof key]);
  };

  // Currency input with comma formatting
  const CurrencyInput = ({
    value,
    onChange,
    disabled
  }: {
    value: number;
    onChange: (val: number) => void;
    disabled?: boolean;
  }) => {
    const [displayValue, setDisplayValue] = useState(formatWithCommas(value));

    useEffect(() => {
      setDisplayValue(formatWithCommas(value));
    }, [value]);

    return (
      <div className="va-input-currency">
        <span className="va-prefix">$</span>
        <input
          type="text"
          className="va-input"
          value={displayValue}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            const num = parseInt(raw) || 0;
            setDisplayValue(formatWithCommas(num));
            onChange(num);
          }}
          onBlur={() => setDisplayValue(formatWithCommas(value))}
          disabled={disabled}
        />
      </div>
    );
  };

  return (
    <div className="ops-card">
      {/* Header row - matches other section headers */}
      <div className="ops-section-header">
        <h3 className="ops-section-title">
          Value-Add Program
          {isSaving && <span className="va-saving">Saving...</span>}
        </h3>
        <div className="ops-section-controls">
          <button
            type="button"
            className={`va-toggle ${isEnabled ? 'on' : ''}`}
            onClick={onToggle}
            disabled={isLoading}
            aria-pressed={isEnabled}
          >
            <span className="va-toggle-slider" />
          </button>
        </div>
      </div>

      {isEnabled && (
        <div className="va-body">
          {/* Left Panel: Inputs in 2-column layout */}
          <div className="va-inputs-panel">
            <div className="va-form">
              {/* Row 1: Reno Start Month */}
              <div className="va-row">
                <label className="va-label">Renovation Start Month</label>
                <input
                  type="number"
                  className="va-input"
                  value={state.renoStartMonth || ''}
                  onChange={(e) => handleNumberInput('renoStartMonth', e)}
                  disabled={isLoading}
                  min="1"
                />
              </div>

              {/* Row 2: Reno Starts Per Month */}
              <div className="va-row">
                <label className="va-label">Reno Starts / Month</label>
                <input
                  type="number"
                  className="va-input"
                  value={state.renoStartsPerMonth || ''}
                  onChange={(e) => handleNumberInput('renoStartsPerMonth', e)}
                  disabled={isLoading}
                  min="1"
                />
              </div>

              {/* Row 3: Months to Complete */}
              <div className="va-row">
                <label className="va-label">Months to Complete Reno</label>
                <input
                  type="number"
                  className="va-input"
                  value={state.monthsToComplete || ''}
                  onChange={(e) => handleNumberInput('monthsToComplete', e)}
                  disabled={isLoading}
                  min="1"
                />
              </div>

              {/* Row 4: Renovation Cost with SF/Unit toggle */}
              <div className="va-row">
                <label className="va-label">Renovation Cost</label>
                <div className="va-input-group">
                  <div className="va-basis-toggle">
                    <button
                      type="button"
                      className={`va-basis-btn ${state.renoCostBasis === 'sf' ? 'active' : ''}`}
                      onClick={() => onUpdate('renoCostBasis', 'sf')}
                      disabled={isLoading}
                    >
                      /SF
                    </button>
                    <button
                      type="button"
                      className={`va-basis-btn ${state.renoCostBasis === 'unit' ? 'active' : ''}`}
                      onClick={() => onUpdate('renoCostBasis', 'unit')}
                      disabled={isLoading}
                    >
                      /Unit
                    </button>
                  </div>
                  <div className="va-input-currency">
                    <span className="va-prefix">$</span>
                    <input
                      type="number"
                      className="va-input"
                      value={state.renoCost || ''}
                      onChange={(e) => handleNumberInput('renoCost', e)}
                      disabled={isLoading}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Relocation Incentive */}
              <div className="va-row">
                <label className="va-label">Relocation Incentive</label>
                <CurrencyInput
                  value={state.relocationIncentive || 0}
                  onChange={(val) => onUpdate('relocationIncentive', val)}
                  disabled={isLoading}
                />
              </div>

              {/* Row 6: Rent Premium */}
              <div className="va-row">
                <label className="va-label">Rent Premium %</label>
                <input
                  type="number"
                  className="va-input"
                  value={state.rentPremiumPct ? Math.round(state.rentPremiumPct * 100) : ''}
                  onChange={(e) => handleNumberInput('rentPremiumPct', e, (v) => v / 100)}
                  disabled={isLoading}
                  min="0"
                  max="100"
                />
              </div>

              {/* Row 7: Relet Months */}
              <div className="va-row">
                <label className="va-label">Relet Lag [Months]</label>
                <input
                  type="number"
                  className="va-input"
                  value={state.reletMonths ?? ''}
                  onChange={(e) => handleNumberInput('reletMonths', e)}
                  disabled={isLoading}
                  min="0"
                />
              </div>

              {/* Row 8: Units to Renovate */}
              <div className="va-row">
                <label className="va-label">Units to Renovate</label>
                <div className="va-input-group">
                  <select
                    className="va-select"
                    value={state.renovateAll ? 'all' : 'custom'}
                    onChange={(e) => onUpdate('renovateAll', e.target.value === 'all')}
                    disabled={isLoading}
                  >
                    <option value="all">All</option>
                    <option value="custom">#</option>
                  </select>
                  {!state.renovateAll && (
                    <input
                      type="number"
                      className="va-input"
                      value={state.unitsToRenovate ?? ''}
                      onChange={(e) => {
                        const val = Math.min(parseInt(e.target.value) || 0, stats.totalUnits);
                        onUpdate('unitsToRenovate', val || null);
                      }}
                      disabled={isLoading}
                      max={stats.totalUnits}
                      min="1"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Costs + Annual Impact (stacked) */}
          <div className="va-summary-panel">
            {/* Costs Section */}
            <div className="va-section">
              <h4 className="va-section-title">Costs</h4>
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

            {/* Annual Impact Section */}
            <div className="va-section">
              <h4 className="va-section-title">Annual Impact (Stabilized)</h4>
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

            {/* Summary Metrics */}
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
          <div className="va-graphic-panel">
            <h4 className="va-graphic-title">Cost Breakdown</h4>
            {/* Treemap */}
            <div className="va-treemap">
              <div
                className="va-treemap-cell va-treemap-reno"
                style={{
                  flexBasis: `${(calculated.costs.renovation / calculated.costs.total) * 100}%`,
                  background: '#05AB3F'
                }}
              >
                <span className="va-treemap-label">Renovation</span>
                <span className="va-treemap-value">{formatCompact(calculated.costs.renovation)}</span>
                <span className="va-treemap-pct">{Math.round((calculated.costs.renovation / calculated.costs.total) * 100)}%</span>
              </div>
              <div className="va-treemap-right">
                <div
                  className="va-treemap-cell"
                  style={{
                    flexBasis: `${(calculated.costs.relocation / (calculated.costs.relocation + calculated.costs.vacancyLoss)) * 100}%`,
                    background: '#EA1846'
                  }}
                >
                  <span className="va-treemap-label">Relocation</span>
                  <span className="va-treemap-value">{formatCompact(calculated.costs.relocation)}</span>
                  <span className="va-treemap-pct">{Math.round((calculated.costs.relocation / calculated.costs.total) * 100)}%</span>
                </div>
                <div
                  className="va-treemap-cell"
                  style={{
                    flexBasis: `${(calculated.costs.vacancyLoss / (calculated.costs.relocation + calculated.costs.vacancyLoss)) * 100}%`,
                    background: '#059DDF'
                  }}
                >
                  <span className="va-treemap-label">Vacancy</span>
                  <span className="va-treemap-value">{formatCompact(calculated.costs.vacancyLoss)}</span>
                  <span className="va-treemap-pct">{Math.round((calculated.costs.vacancyLoss / calculated.costs.total) * 100)}%</span>
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
      )}
    </div>
  );
}

export default ValueAddCard;
