'use client';

import React, { useMemo, useState } from 'react';
import { mutate } from 'swr';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectInflationSettings, InflationSelection } from '@/hooks/useInflationSettings';

interface Props {
  projectId: number;
}

const formatRate = (rate: number | null) => {
  if (rate === null || rate === undefined) return '—';
  return `${(rate * 100).toFixed(1)}%`;
};

export function InflationRateDisplay({ projectId }: Props) {
  const { data, isLoading, error } = useProjectInflationSettings(projectId);
  const queryClient = useQueryClient();
  const [savingField, setSavingField] = useState<'cost' | 'price' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<'cost' | 'price' | null>(null); // kept for potential future use

  const sortedSets = useMemo(() => {
    if (!data?.available_sets) return [] as InflationSelection[];
    return [...data.available_sets].sort((a, b) => {
      const rateA = a.current_rate ?? -1;
      const rateB = b.current_rate ?? -1;
      if (rateA === rateB) return a.set_name.localeCompare(b.set_name);
      return rateA - rateB;
    });
  }, [data?.available_sets]);

  const updateSelection = async (
    kind: 'cost' | 'price',
    value: string,
  ) => {
    if (!data) return;
    const setId = value ? Number(value) : null;

    setSavingField(kind);
    setLocalError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/inflation-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost_inflation_set_id: kind === 'cost' ? setId : data.cost_inflation.set_id,
          price_inflation_set_id: kind === 'price' ? setId : data.price_inflation.set_id,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to save inflation settings');
      }

      await mutate(`/api/projects/${projectId}/inflation-settings`);

      // Trigger downstream refresh hooks (budget/sales data) when available
      mutate(`/api/projects/${projectId}/budget`);
      mutate(`/api/projects/${projectId}/sales`);
      // Also refresh budget items list (for Escalated column calculations)
      mutate(`/api/budget/${projectId}/items`);

      // Get the new inflation rate for the selected set
      const selectedSet = data.available_sets.find((s) => s.set_id === setId);
      const newRate = selectedSet?.current_rate ?? null;

      // If price inflation changed, update land_use_pricing.growth_rate for all rows
      if (kind === 'price' && newRate !== null) {
        try {
          await fetch(`/api/projects/${projectId}/pricing-assumptions/bulk-update-field`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'growth_rate', value: newRate }),
          });
        } catch (updateErr) {
          console.error('Failed to update pricing growth rate:', updateErr);
        }
      }

      // Trigger recalculation for both cost and price inflation changes
      // - Cost inflation: affects improvement offset escalation
      // - Price inflation: affects lot price escalation (via growth_rate in pricing table)
      try {
        await fetch(`/api/projects/${projectId}/recalculate-sfd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        // Refresh sales-related data after recalc
        // Note: ParcelSalesTable uses React Query, not SWR
        await queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
        mutate(`/api/projects/${projectId}/parcels`);
        mutate(`/api/projects/${projectId}/pricing-assumptions`);
        // Refresh validation report (uses closing costs affected by inflation)
        mutate(`/api/projects/${projectId}/validation-report`);
        // Refresh cash flow analysis
        mutate(`/api/projects/${projectId}/cash-flow/generate`);
      } catch (recalcErr) {
        console.error('Failed to recalculate sales after inflation change:', recalcErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save inflation settings';
      setLocalError(message);
      console.error(message);
    } finally {
      setSavingField(null);
    }
  };

  if (isLoading) {
    return <div className="text-muted small">Loading inflation…</div>;
  }

  if (error) {
    return <div className="text-danger small">Inflation unavailable</div>;
  }

  const costValue = data?.cost_inflation?.set_id ?? '';
  const priceValue = data?.price_inflation?.set_id ?? '';

  const renderInflationSelect = (
    kind: 'cost' | 'price',
    value: number | '' | null,
    currentRate: number | null | undefined,
    setName: string | undefined,
  ) => {
    const displayRate = formatRate(currentRate ?? null);
    const collapsedWidth = 78; // px
    const selectWidth = collapsedWidth;

    return (
      <div
        className="position-relative"
        style={{
          display: 'inline-block',
          width: selectWidth,
          minWidth: selectWidth,
          maxWidth: selectWidth,
          transition: 'width 120ms ease',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <select
          className="form-select form-select-sm text-end"
          style={{
            width: selectWidth,
            minWidth: selectWidth,
            maxWidth: selectWidth,
            display: 'inline-block',
            boxSizing: 'border-box',
            color: 'transparent',
            paddingRight: '1.75rem', // keep arrow spacing
          }}
          value={value === null ? '' : value}
          title={setName || `Select ${kind} inflation`}
          onChange={(e) => updateSelection(kind, e.target.value)}
          disabled={savingField === kind}
          onFocus={() => setFocusField(kind)}
          onBlur={() => setFocusField((prev) => (prev === kind ? null : prev))}
        >
          <option value="">—</option>
          {sortedSets.map((set) => (
            <option key={set.set_id} value={set.set_id} title={set.set_name}>
              {formatRate(set.current_rate)} - {set.set_name}
            </option>
          ))}
        </select>
        <div
          className="form-select form-select-sm text-end pe-4 position-absolute top-0 start-0 h-100 w-100 d-flex align-items-center justify-content-end pointer-events-none"
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: 'var(--cui-body-color)',
            width: selectWidth,
            minWidth: selectWidth,
            maxWidth: selectWidth,
            display: 'inline-flex',
            boxSizing: 'border-box',
            paddingRight: '2.1rem', // keep the percent value away from the chevron
          }}
        >
          {displayRate}
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column align-items-end gap-2">
      <div className="d-flex align-items-center gap-2">
        <span className="text-muted small">Cost Inflation</span>
        {renderInflationSelect(
          'cost',
          costValue,
          data?.cost_inflation?.current_rate,
          data?.cost_inflation?.set_name,
        )}
      </div>

      <div className="d-flex align-items-center gap-2">
        <span className="text-muted small">Price Inflation</span>
        {renderInflationSelect(
          'price',
          priceValue,
          data?.price_inflation?.current_rate,
          data?.price_inflation?.set_name,
        )}
      </div>
      {localError && <div className="text-danger small text-end" style={{ maxWidth: 220 }}>{localError}</div>}
    </div>
  );
}
