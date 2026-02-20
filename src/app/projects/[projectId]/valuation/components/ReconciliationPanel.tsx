/**
 * ReconciliationPanel Component
 *
 * Final step in the valuation workflow — weighs the three approaches
 * to value and arrives at a reconciled opinion of value.
 *
 * @version 1.0
 * @created 2026-02-20
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { saveValuationReconciliation } from '@/lib/api/valuation';
import type { ValuationSummary, ValuationReconciliation } from '@/types/valuation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconciliationPanelProps {
  projectId: number;
  valuationData: ValuationSummary;
  onRefresh?: () => void;
}

interface ApproachRow {
  key: 'sales_comparison' | 'cost_approach' | 'income_approach';
  label: string;
  indicatedValue: number | null;
  weight: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 1200;

function formatCurrency(value: number | null | undefined): string {
  if (!value && value !== 0) return '—';
  return `$${Math.round(Number(value)).toLocaleString()}`;
}

function formatLargeCurrency(value: number | null | undefined): string {
  if (!value && value !== 0) return '—';
  const num = Number(value);
  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  return formatCurrency(value);
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReconciliationPanel({
  projectId,
  valuationData,
  onRefresh,
}: ReconciliationPanelProps) {
  const existing = valuationData.reconciliation;

  // ── Indicated values from the three approaches ──────────────────────────
  const salesIndicated = valuationData.sales_comparison_summary?.total_indicated_value ?? null;
  const costIndicated = valuationData.cost_approach?.indicated_value ?? null;
  const incomeIndicated = valuationData.income_approach?.direct_cap_value
    ?? valuationData.income_approach?.dcf_value
    ?? null;

  // ── Form state ──────────────────────────────────────────────────────────
  const [salesWeight, setSalesWeight] = useState<number>(
    existing?.sales_comparison_weight != null ? Number(existing.sales_comparison_weight) * 100 : 0
  );
  const [costWeight, setCostWeight] = useState<number>(
    existing?.cost_approach_weight != null ? Number(existing.cost_approach_weight) * 100 : 0
  );
  const [incomeWeight, setIncomeWeight] = useState<number>(
    existing?.income_approach_weight != null ? Number(existing.income_approach_weight) * 100 : 0
  );
  const [narrative, setNarrative] = useState<string>(existing?.reconciliation_narrative ?? '');
  const [valuationDate, setValuationDate] = useState<string>(
    existing?.valuation_date ?? todayISO()
  );
  const [manualOverride, setManualOverride] = useState<number | null>(null);

  // ── Save state ──────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconciliationIdRef = useRef<number | null>(existing?.reconciliation_id ?? null);

  // ── Derived calculations ────────────────────────────────────────────────
  const totalWeight = salesWeight + costWeight + incomeWeight;
  const weightsValid = totalWeight >= 99.5 && totalWeight <= 100.5;

  const calculatedValue = useMemo(() => {
    const sv = (salesIndicated ?? 0) * (salesWeight / 100);
    const cv = (costIndicated ?? 0) * (costWeight / 100);
    const iv = (incomeIndicated ?? 0) * (incomeWeight / 100);
    return sv + cv + iv;
  }, [salesIndicated, costIndicated, incomeIndicated, salesWeight, costWeight, incomeWeight]);

  const finalValue = manualOverride ?? calculatedValue;

  // ── Approach rows for rendering ─────────────────────────────────────────
  const approaches: ApproachRow[] = [
    { key: 'sales_comparison', label: 'Sales Comparison', indicatedValue: salesIndicated, weight: salesWeight },
    { key: 'cost_approach', label: 'Cost Approach', indicatedValue: costIndicated, weight: costWeight },
    { key: 'income_approach', label: 'Income Approach', indicatedValue: incomeIndicated, weight: incomeWeight },
  ];

  // ── Save logic ──────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const payload = {
        project_id: projectId,
        sales_comparison_value: salesIndicated ?? undefined,
        sales_comparison_weight: salesWeight / 100,
        cost_approach_value: costIndicated ?? undefined,
        cost_approach_weight: costWeight / 100,
        income_approach_value: incomeIndicated ?? undefined,
        income_approach_weight: incomeWeight / 100,
        final_reconciled_value: finalValue,
        reconciliation_narrative: narrative,
        valuation_date: valuationDate || todayISO(),
      };
      const result = await saveValuationReconciliation(projectId, payload);
      reconciliationIdRef.current = result.reconciliation_id;
      setLastSaved(new Date().toLocaleTimeString());
      onRefresh?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [
    projectId, salesIndicated, costIndicated, incomeIndicated,
    salesWeight, costWeight, incomeWeight, finalValue, narrative, valuationDate, onRefresh,
  ]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(doSave, DEBOUNCE_MS);
  }, [doSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ── Weight change handler ───────────────────────────────────────────────
  const setWeight = useCallback((key: ApproachRow['key'], value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    switch (key) {
      case 'sales_comparison': setSalesWeight(clamped); break;
      case 'cost_approach': setCostWeight(clamped); break;
      case 'income_approach': setIncomeWeight(clamped); break;
    }
    setManualOverride(null); // reset override when weights change
    debouncedSave();
  }, [debouncedSave]);

  // ── Pull latest values from approaches ──────────────────────────────────
  const pullLatestValues = useCallback(() => {
    // Values are already derived from valuationData props;
    // just clear any manual override and trigger save with current weights
    setManualOverride(null);
    debouncedSave();
  }, [debouncedSave]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column" style={{ gap: '1.25rem' }}>
      {/* Header Card */}
      <CCard>
        <div
          className="px-4 py-3 d-flex align-items-center justify-content-between"
          style={{
            backgroundColor: 'var(--surface-card-header)',
            borderBottom: '1px solid var(--cui-border-color)',
          }}
        >
          <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
            <h3
              className="mb-0"
              style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
            >
              Reconciliation of Value
            </h3>
          </div>
          <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
            {isSaving && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}>
                Saving...
              </span>
            )}
            {lastSaved && !isSaving && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}>
                Saved {lastSaved}
              </span>
            )}
            <button
              onClick={pullLatestValues}
              className="btn btn-sm"
              style={{
                fontSize: '0.8125rem',
                backgroundColor: 'var(--cui-tertiary-bg)',
                color: 'var(--cui-body-color)',
                border: '1px solid var(--cui-border-color)',
              }}
            >
              Pull Latest Values
            </button>
          </div>
        </div>

        <CCardBody className="p-0">
          {/* Approaches Table */}
          <div className="px-4 pt-4 pb-2">
            <table className="w-100" style={{ borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
                  <th
                    className="text-start py-2"
                    style={{ color: 'var(--cui-body-color)', fontWeight: 600, width: '30%' }}
                  >
                    Approach
                  </th>
                  <th
                    className="text-end py-2"
                    style={{ color: 'var(--cui-body-color)', fontWeight: 600, width: '25%' }}
                  >
                    Indicated Value
                  </th>
                  <th
                    className="text-center py-2"
                    style={{ color: 'var(--cui-body-color)', fontWeight: 600, width: '20%' }}
                  >
                    Weight
                  </th>
                  <th
                    className="text-end py-2"
                    style={{ color: 'var(--cui-body-color)', fontWeight: 600, width: '25%' }}
                  >
                    Weighted Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {approaches.map((a) => {
                  const weightedVal = (a.indicatedValue ?? 0) * (a.weight / 100);
                  const hasValue = a.indicatedValue != null && a.indicatedValue > 0;
                  return (
                    <tr
                      key={a.key}
                      style={{ borderBottom: '1px solid var(--cui-border-color-translucent)' }}
                    >
                      <td className="py-3" style={{ color: 'var(--cui-body-color)' }}>
                        {a.label}
                        {!hasValue && (
                          <span
                            className="ms-2"
                            style={{
                              fontSize: '0.6875rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--cui-warning-bg)',
                              color: 'var(--cui-warning)',
                            }}
                          >
                            No data
                          </span>
                        )}
                      </td>
                      <td
                        className="text-end py-3"
                        style={{
                          color: hasValue ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)',
                          fontWeight: 500,
                        }}
                      >
                        {hasValue ? formatLargeCurrency(a.indicatedValue) : '—'}
                      </td>
                      <td className="text-center py-3">
                        <div className="d-flex align-items-center justify-content-center" style={{ gap: '0.375rem' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            value={a.weight}
                            onChange={(e) => setWeight(a.key, Number(e.target.value))}
                            disabled={!hasValue}
                            style={{
                              width: '60px',
                              textAlign: 'center',
                              padding: '4px 6px',
                              fontSize: '0.875rem',
                              border: '1px solid var(--cui-border-color)',
                              borderRadius: '4px',
                              backgroundColor: hasValue ? 'var(--cui-input-bg, var(--cui-card-bg))' : 'var(--cui-tertiary-bg)',
                              color: 'var(--cui-body-color)',
                            }}
                          />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}>%</span>
                        </div>
                      </td>
                      <td
                        className="text-end py-3"
                        style={{
                          color: a.weight > 0 && hasValue ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)',
                          fontWeight: 500,
                        }}
                      >
                        {a.weight > 0 && hasValue ? formatLargeCurrency(weightedVal) : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Total weight row */}
                <tr style={{ borderTop: '2px solid var(--cui-border-color)' }}>
                  <td className="py-3" style={{ fontWeight: 600, color: 'var(--cui-body-color)' }}>
                    Total
                  </td>
                  <td></td>
                  <td className="text-center py-3">
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: '12px',
                        backgroundColor: weightsValid
                          ? 'var(--cui-success-bg)'
                          : totalWeight > 100.5
                            ? 'var(--cui-danger-bg)'
                            : 'var(--cui-warning-bg)',
                        color: weightsValid
                          ? 'var(--cui-success)'
                          : totalWeight > 100.5
                            ? 'var(--cui-danger)'
                            : 'var(--cui-warning)',
                      }}
                    >
                      {totalWeight.toFixed(0)}%
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final Reconciled Value */}
          <div className="mx-4 mb-4">
            <div
              className="p-4 rounded"
              style={{
                backgroundColor: weightsValid ? 'var(--cui-success-bg)' : 'var(--cui-tertiary-bg)',
                border: `2px solid ${weightsValid ? 'var(--cui-success)' : 'var(--cui-border-color)'}`,
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span
                  style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
                >
                  Final Reconciled Value
                </span>
                <span
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: weightsValid ? 'var(--cui-success)' : 'var(--cui-body-color)',
                  }}
                >
                  {formatLargeCurrency(finalValue)}
                </span>
              </div>
              {manualOverride != null && (
                <div style={{ fontSize: '0.75rem', color: 'var(--cui-warning)' }}>
                  Manual override active — calculated value: {formatLargeCurrency(calculatedValue)}
                  <button
                    className="btn btn-link btn-sm p-0 ms-2"
                    style={{ fontSize: '0.75rem', color: 'var(--cui-primary)' }}
                    onClick={() => { setManualOverride(null); debouncedSave(); }}
                  >
                    Clear override
                  </button>
                </div>
              )}
              {!weightsValid && totalWeight > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--cui-warning)' }}>
                  Weights must total 100% for final value
                </div>
              )}
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* Narrative & Date Card */}
      <CCard>
        <CCardBody className="p-4">
          <div className="d-flex flex-column" style={{ gap: '1rem' }}>
            {/* Valuation Date */}
            <div>
              <label
                className="d-block mb-1"
                style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
              >
                Effective Date of Value
              </label>
              <input
                type="date"
                value={valuationDate}
                onChange={(e) => { setValuationDate(e.target.value); debouncedSave(); }}
                style={{
                  width: '200px',
                  padding: '6px 10px',
                  fontSize: '0.875rem',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--cui-input-bg, var(--cui-card-bg))',
                  color: 'var(--cui-body-color)',
                }}
              />
            </div>

            {/* Narrative */}
            <div>
              <label
                className="d-block mb-1"
                style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
              >
                Reconciliation Narrative
              </label>
              <textarea
                rows={6}
                value={narrative}
                onChange={(e) => { setNarrative(e.target.value); debouncedSave(); }}
                placeholder="Explain the rationale for the weighting of each approach. Consider data quality, market conditions, property type applicability, and highest-and-best-use alignment..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--cui-input-bg, var(--cui-card-bg))',
                  color: 'var(--cui-body-color)',
                  resize: 'vertical',
                }}
              />
              <div
                className="mt-1 text-end"
                style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}
              >
                {narrative.length > 0 ? `${narrative.length} characters` : ''}
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* Error Banner */}
      {saveError && (
        <div
          className="p-3 rounded"
          style={{
            backgroundColor: 'var(--cui-danger-bg)',
            color: 'var(--cui-danger)',
            fontSize: '0.875rem',
            border: '1px solid var(--cui-danger)',
          }}
        >
          Save failed: {saveError}
          <button
            className="btn btn-sm ms-3"
            style={{ color: 'var(--cui-danger)', textDecoration: 'underline', padding: 0 }}
            onClick={doSave}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
