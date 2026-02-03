/**
 * Sale Detail Form
 * Benchmark override panel rendered below the main row
 */

'use client';

import React, { useMemo, useState } from 'react';
import type { ParcelWithSale, SalePhaseSummary, SalePhaseBenchmarks } from '@/types/sales-absorption';
import { useSaveParcelOverrides } from '@/hooks/useSalesAbsorption';
import { formatMoney, formatNumber } from '@/utils/formatters/number';
import { calculateNetProceeds } from '@/utils/sales/calculations';
import { SemanticButton } from '@/components/ui/landscape';
import './SaleDetailForm.css';

interface Props {
  projectId: number;
  parcel: ParcelWithSale;
  salePhase?: SalePhaseSummary;
  benchmarkDefaults?: SalePhaseBenchmarks;
  onClose: () => void;
}

const ONSITE_OPTIONS = [5, 6, 6.5, 7, 8];
const COMMISSION_OPTIONS = [2.5, 3, 3.5, 4];
const CLOSING_PER_UNIT_OPTIONS = [500, 750, 1000];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">{label}</div>
    <div className="text-sm text-gray-900 space-y-1">{children}</div>
  </div>
);

export default function SaleDetailForm({ projectId, parcel, salePhase, benchmarkDefaults, onClose }: Props) {
  const saveOverrides = useSaveParcelOverrides(projectId);

  const initialOnsitePercent = parcel.onsite_cost_pct ?? salePhase?.onsite_cost_pct ?? benchmarkDefaults?.onsite_cost_pct ?? 6.5;
  const initialCommissionPercent = parcel.commission_pct ?? salePhase?.commission_pct ?? benchmarkDefaults?.commission_pct ?? 3;
  const initialClosingPerUnit = parcel.closing_cost_per_unit ?? salePhase?.closing_cost_per_unit ?? benchmarkDefaults?.closing_cost_per_unit ?? 750;

  const [onsiteMode, setOnsiteMode] = useState<'percent' | 'dollar'>(parcel.onsite_cost_amount ? 'dollar' : 'percent');
  const [onsitePercent, setOnsitePercent] = useState<number>(initialOnsitePercent);
  const [onsiteAmount, setOnsiteAmount] = useState<number>(parcel.onsite_cost_amount ?? 0);
  const [onsiteSelection, setOnsiteSelection] = useState<string>(() => {
    if (onsiteMode === 'dollar') return 'custom-dollar';
    return ONSITE_OPTIONS.includes(initialOnsitePercent) ? String(initialOnsitePercent) : 'custom-percent';
  });

  const [commissionMode, setCommissionMode] = useState<'percent' | 'dollar'>(parcel.commission_amount ? 'dollar' : 'percent');
  const [commissionPercent, setCommissionPercent] = useState<number>(initialCommissionPercent);
  const [commissionAmount, setCommissionAmount] = useState<number>(parcel.commission_amount ?? 0);
  const [commissionSelection, setCommissionSelection] = useState<string>(() => {
    if (commissionMode === 'dollar') return 'custom-dollar';
    return COMMISSION_OPTIONS.includes(initialCommissionPercent) ? String(initialCommissionPercent) : 'custom-percent';
  });

  const [closingMode, setClosingMode] = useState<'per_unit' | 'total'>(parcel.closing_cost_total && !parcel.closing_cost_per_unit ? 'total' : 'per_unit');
  const [closingPerUnit, setClosingPerUnit] = useState<number>(initialClosingPerUnit);
  const [closingTotal, setClosingTotal] = useState<number>(parcel.closing_cost_total ?? initialClosingPerUnit * parcel.units);
  const [closingSelection, setClosingSelection] = useState<string>(() => {
    if (closingMode === 'total') return 'custom-total';
    return CLOSING_PER_UNIT_OPTIONS.includes(initialClosingPerUnit) ? String(initialClosingPerUnit) : 'custom';
  });

  const grossValue = parcel.gross_value ?? 0;

  const netResult = useMemo(() => {
    if (!grossValue) return null;
    return calculateNetProceeds({
      grossValue,
      units: parcel.units,
      onsiteCostPercent: onsiteMode === 'percent' ? onsitePercent : null,
      onsiteCostAmount: onsiteMode === 'dollar' ? onsiteAmount : null,
      commissionPercent: commissionMode === 'percent' ? commissionPercent : null,
      commissionAmount: commissionMode === 'dollar' ? commissionAmount : null,
      closingCostPerUnit: closingMode === 'per_unit' ? closingPerUnit : null,
      closingCostTotal: closingMode === 'total' ? closingTotal : null,
    });
  }, [grossValue, parcel.units, onsiteMode, onsitePercent, onsiteAmount, commissionMode, commissionPercent, commissionAmount, closingMode, closingPerUnit, closingTotal]);

  const onsiteCalculated = onsiteMode === 'percent' ? (grossValue * onsitePercent) / 100 : onsiteAmount;
  const commissionCalculated = commissionMode === 'percent' ? (grossValue * commissionPercent) / 100 : commissionAmount;
  const closingCalculated = closingMode === 'per_unit' ? closingPerUnit * parcel.units : closingTotal;

  const handleSave = async () => {
    if (!parcel.sale_date) {
      return;
    }

    try {
      await saveOverrides.mutateAsync({
        parcel_id: parcel.parcel_id,
        onsite_cost_pct: onsiteMode === 'percent' ? onsitePercent : null,
        onsite_cost_amount: onsiteMode === 'dollar' ? onsiteAmount : null,
        commission_pct: commissionMode === 'percent' ? commissionPercent : null,
        commission_amount: commissionMode === 'dollar' ? commissionAmount : null,
        closing_cost_per_unit: closingMode === 'per_unit' ? closingPerUnit : null,
        closing_cost_total: closingMode === 'total' ? closingTotal : null,
      });
      onClose();
    } catch (error) {
      // Error surfaced via mutation state below
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 px-4 py-2 text-sm text-blue-900 flex items-center justify-between">
        <div>
          <span className="font-semibold">Sale Details</span>{' '}
          {salePhase?.phase_code && <span className="text-blue-600">• Phase {salePhase.phase_code}</span>}
        </div>
        {parcel.sale_date ? (
          <span className="font-mono text-xs text-gray-500">{parcel.sale_date}</span>
        ) : (
          <span className="text-xs text-red-500">Assign a sale date to enable overrides</span>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Field label="Sale Date">
            <div className="font-semibold">{parcel.sale_date ? new Date(parcel.sale_date).toLocaleDateString() : 'Pending'}</div>
            <div className="text-xs text-gray-500">Auto-filled from sale phase</div>
          </Field>

          <Field label="Gross Price">
            <div className="font-mono text-lg text-gray-900">{formatMoney(grossValue)}</div>
            <div className="text-xs text-gray-500">{formatNumber(parcel.units)} units</div>
          </Field>

          <Field label="Less: Onsites">
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              value={onsiteMode === 'percent' ? onsiteSelection : 'custom-dollar'}
              onChange={(event) => {
                const value = event.target.value;
                setOnsiteSelection(value);
                if (value === 'custom-dollar') {
                  setOnsiteMode('dollar');
                  return;
                }
                setOnsiteMode('percent');
                if (value !== 'custom-percent') {
                  setOnsitePercent(Number(value));
                }
              }}
            >
              {ONSITE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toFixed(1)}%
                </option>
              ))}
              <option value="custom-percent">Custom %</option>
              <option value="custom-dollar">Custom $</option>
            </select>
            {onsiteMode === 'percent' && onsiteSelection === 'custom-percent' && (
              <input
                type="number"
                value={onsitePercent}
                onChange={(event) => setOnsitePercent(Number(event.target.value) || 0)}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                min={0}
                max={20}
                step={0.1}
              />
            )}
            {onsiteMode === 'dollar' && (
              <input
                type="number"
                value={onsiteAmount}
                onChange={(event) => setOnsiteAmount(Number(event.target.value) || 0)}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                min={0}
                step={1000}
              />
            )}
            <div className="text-xs text-gray-500">{formatMoney(onsiteCalculated)}</div>
          </Field>

          <Field label="Net Price">
            <div className="font-mono text-lg text-gray-900">
              {netResult ? formatMoney(netResult.netPrice) : formatMoney(grossValue - onsiteCalculated)}
            </div>
            <div className="text-xs text-gray-500">Gross - Onsites</div>
          </Field>

          <Field label="Commissions">
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              value={commissionMode === 'percent' ? commissionSelection : 'custom-dollar'}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'custom-dollar') {
                  setCommissionMode('dollar');
                  setCommissionSelection(value);
                  return;
                }
                setCommissionMode('percent');
                setCommissionSelection(value);
                if (value !== 'custom-percent') {
                  setCommissionPercent(Number(value));
                }
              }}
            >
              {COMMISSION_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toFixed(1)}%
                </option>
              ))}
              <option value="custom-percent">Custom %</option>
              <option value="custom-dollar">Custom $</option>
            </select>
            {commissionMode === 'percent' && commissionSelection === 'custom-percent' && (
              <input
                type="number"
                value={commissionPercent}
                onChange={(event) => setCommissionPercent(Number(event.target.value) || 0)}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                min={0}
                max={10}
                step={0.1}
              />
            )}
            {commissionMode === 'dollar' && (
              <input
                type="number"
                value={commissionAmount}
                onChange={(event) => setCommissionAmount(Number(event.target.value) || 0)}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                min={0}
                step={1000}
              />
            )}
            <div className="text-xs text-gray-500">{formatMoney(commissionCalculated)}</div>
          </Field>

          <Field label="Closing Costs">
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              value={closingMode === 'per_unit' ? closingSelection : 'custom-total'}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'custom-total') {
                  setClosingMode('total');
                  setClosingSelection(value);
                  return;
                }
                setClosingMode('per_unit');
                setClosingSelection(value);
                if (value !== 'custom') {
                  setClosingPerUnit(Number(value));
                }
              }}
            >
              {CLOSING_PER_UNIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  ${value.toLocaleString()}/lot
                </option>
              ))}
              <option value="custom">Custom $/lot</option>
              <option value="custom-total">Custom Total</option>
            </select>
            {closingMode === 'per_unit' && closingSelection === 'custom' && (
              <input
                type="number"
                value={closingPerUnit}
                onChange={(event) => setClosingPerUnit(Number(event.target.value) || 0)}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                min={0}
                step={50}
              />
            )}
            {closingMode === 'total' && (
              <input
                type="number"
                value={closingTotal}
                onChange={(event) => setClosingTotal(Number(event.target.value) || 0)}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                min={0}
                step={1000}
              />
            )}
            <div className="text-xs text-gray-500">{formatMoney(closingCalculated)}</div>
          </Field>
        </div>

        <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Net Proceeds</div>
            <div className="text-2xl font-bold text-blue-700">
              {parcel.sale_date ? formatMoney(netResult?.netProceeds ?? 0) : 'Pending'}
            </div>
            <div className="text-xs text-gray-500">
              Net Price - Commissions - Closing Costs
            </div>
          </div>

          <div className="flex gap-3">
            <SemanticButton
              intent="secondary-action"
              size="sm"
              className="sale-detail-cancel"
              onClick={onClose}
            >
              Cancel
            </SemanticButton>
            <SemanticButton
              intent="primary-action"
              size="sm"
              className="sale-detail-save"
              onClick={handleSave}
              disabled={!parcel.sale_date || saveOverrides.isPending}
            >
              {saveOverrides.isPending ? 'Saving…' : 'Save Changes'}
            </SemanticButton>
          </div>
        </div>

        {saveOverrides.isError && (
          <div className="mt-4 p-2 bg-red-50 border border-red-200 text-sm text-red-600 rounded">
            Failed to save overrides. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
