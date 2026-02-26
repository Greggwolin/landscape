'use client';

import React from 'react';
import { InputCell } from './InputCell';
import { formatCurrency, formatPercent } from './types';
import type { CalculatedValues, ValueAddState } from '@/hooks/useValueAddAssumptions';

interface ValueAddAccordionProps {
  isOpen: boolean;
  state: ValueAddState;
  calculated: CalculatedValues;
  maxUnits: number;
  onUpdate: <K extends keyof ValueAddState>(key: K, value: ValueAddState[K]) => void;
  errors?: Partial<Record<keyof ValueAddState, string>>;
  isLoading?: boolean;
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US');
};

export function ValueAddAccordion({
  isOpen,
  state,
  calculated,
  maxUnits,
  onUpdate,
  errors = {},
  isLoading = false
}: ValueAddAccordionProps) {
  return (
    <div
      className={`ops-value-add-accordion ${isOpen ? 'open' : 'closed'}`}
      aria-hidden={!isOpen}
    >
      <div className="ops-value-add-card">
        <div className="ops-value-add-section">
          <div className="ops-value-add-section-title">Renovation Program</div>
          <div className="ops-value-add-grid">
            <div className="ops-value-add-field">
              <label className="ops-value-add-label">Renovation Cost</label>
              <div className="ops-value-add-input">
                <span className="ops-value-add-suffix">$/SF</span>
                <InputCell
                  value={state.renoCostPerSf}
                  variant="as-is"
                  format="currency"
                  disabled={isLoading}
                  onChange={(val) => onUpdate('renoCostPerSf', val ?? 0)}
                />
              </div>
              {errors.renoCostPerSf && <div className="ops-value-add-error">{errors.renoCostPerSf}</div>}
            </div>

            <div className="ops-value-add-field">
              <label className="ops-value-add-label">Relocation Incentive</label>
              <div className="ops-value-add-input">
                <span className="ops-value-add-suffix">$/Unit</span>
                <InputCell
                  value={state.relocationIncentive}
                  variant="as-is"
                  format="currency"
                  disabled={isLoading}
                  onChange={(val) => onUpdate('relocationIncentive', val ?? 0)}
                />
              </div>
              {errors.relocationIncentive && <div className="ops-value-add-error">{errors.relocationIncentive}</div>}
            </div>

            <div className="ops-value-add-field ops-value-add-field-wide">
              <label className="ops-value-add-label">Units to Renovate</label>
              <div className="ops-value-add-units">
                <button
                  type="button"
                  className={`ops-value-add-toggle ${state.renovateAll ? 'active' : ''}`}
                  onClick={() => onUpdate('renovateAll', true)}
                  disabled={isLoading}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`ops-value-add-toggle ${!state.renovateAll ? 'active' : ''}`}
                  onClick={() => onUpdate('renovateAll', false)}
                  disabled={isLoading}
                >
                  Custom
                </button>
                <InputCell
                  value={state.renovateAll ? maxUnits : state.unitsToRenovate}
                  variant="as-is"
                  format="number"
                  disabled={isLoading || state.renovateAll}
                  onChange={(val) => onUpdate('unitsToRenovate', val ?? null)}
                  placeholder="—"
                  className={state.renovateAll ? 'ops-value-add-disabled' : ''}
                />
              </div>
              <div className="ops-value-add-help">
                When &quot;Custom&quot; selected, input enabled. Max: {formatNumber(maxUnits)} units.
              </div>
              {errors.unitsToRenovate && <div className="ops-value-add-error">{errors.unitsToRenovate}</div>}
            </div>

            <div className="ops-value-add-field">
              <label className="ops-value-add-label">Renovation Pace</label>
              <div className="ops-value-add-input">
                <span className="ops-value-add-suffix">Units/Mo</span>
                <InputCell
                  value={state.renoPacePerMonth}
                  variant="as-is"
                  format="number"
                  disabled={isLoading}
                  onChange={(val) => onUpdate('renoPacePerMonth', val ?? 0)}
                />
              </div>
              {errors.renoPacePerMonth && <div className="ops-value-add-error">{errors.renoPacePerMonth}</div>}
            </div>

            <div className="ops-value-add-field">
              <label className="ops-value-add-label">Start Month</label>
              <div className="ops-value-add-input">
                <InputCell
                  value={state.renoStartMonth}
                  variant="as-is"
                  format="number"
                  disabled={isLoading}
                  onChange={(val) => onUpdate('renoStartMonth', val ?? 0)}
                />
              </div>
              {errors.renoStartMonth && <div className="ops-value-add-error">{errors.renoStartMonth}</div>}
            </div>
          </div>

          <div className="ops-value-add-divider" />

          <div className="ops-value-add-calc">
            <div className="ops-value-add-calc-label">Effective Cost/Unit</div>
            <div className="ops-value-add-calc-value">
              {formatCurrency(calculated.effectiveCostPerUnit)}
            </div>
            <div className="ops-value-add-calc-help">
              (Reno $/SF × Avg SF) + Relocation
            </div>
          </div>
        </div>

        <div className="ops-value-add-section">
          <div className="ops-value-add-section-title">Rent Premium Capture</div>
          <div className="ops-value-add-grid">
            <div className="ops-value-add-field">
              <label className="ops-value-add-label">Rent Premium</label>
              <div className="ops-value-add-input">
                <span className="ops-value-add-suffix">%</span>
                <InputCell
                  value={state.rentPremiumPct}
                  variant="as-is"
                  format="percent"
                  disabled={isLoading}
                  onChange={(val) => onUpdate('rentPremiumPct', val ?? 0)}
                />
              </div>
              {errors.rentPremiumPct && <div className="ops-value-add-error">{errors.rentPremiumPct}</div>}
            </div>

            <div className="ops-value-add-field">
              <label className="ops-value-add-label">Relet Lag</label>
              <div className="ops-value-add-input">
                <span className="ops-value-add-suffix">Months</span>
                <InputCell
                  value={state.reletLagMonths}
                  variant="as-is"
                  format="number"
                  disabled={isLoading}
                  onChange={(val) => onUpdate('reletLagMonths', val ?? 0)}
                />
              </div>
              {errors.reletLagMonths && <div className="ops-value-add-error">{errors.reletLagMonths}</div>}
            </div>
          </div>
        </div>

        <div className="ops-value-add-section">
          <div className="ops-value-add-section-title">Program Summary</div>
          <div className="ops-value-add-summary">
            <div className="ops-value-add-summary-row">
              <span>Total Renovation Cost</span>
              <span>{formatCurrency(calculated.totalRenovationCost)}</span>
            </div>
            <div className="ops-value-add-summary-row">
              <span>Renovation Duration</span>
              <span>{formatNumber(calculated.renovationDurationMonths)} months</span>
            </div>
            <div className="ops-value-add-summary-row">
              <span>Stabilized Annual Premium</span>
              <span>{formatCurrency(calculated.stabilizedAnnualPremium)}</span>
            </div>
            <div className="ops-value-add-summary-row">
              <span>Simple Payback</span>
              <span>{formatNumber(calculated.simplePaybackMonths)} months</span>
            </div>
          </div>
          <div className="ops-value-add-summary-note">
            {state.rentPremiumPct !== null
              ? <>Rent premium assumed at {formatPercent(state.rentPremiumPct)} on renovated units.</>
              : <>Configure rent premium to see projected impact.</>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default ValueAddAccordion;
