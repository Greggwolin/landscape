'use client';

/**
 * C12 · Valuation · Cash Flow — Slice 1 reference composition (land).
 *
 * The reference draws the app's own land cash flow (assumptions column,
 * area/phase filter, headline tiles, time and cost toggles, the period table)
 * in the design view's dense style. So this composition renders the live
 * components unchanged — same engine, same assumptions writes, same export —
 * inside a wrapper the design stylesheet re-skins. Nothing here computes.
 */
import React, { useCallback, useState } from 'react';
import { ExportButton } from '@/components/admin';
import { CashFlowAnalysisTab } from '@/components/analysis/cashflow';
import { UnifiedAssumptionsPanel } from '@/components/valuation/UnifiedAssumptionsPanel';
import type { CashFlowSummary } from '@/components/valuation/assumptions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;

export function DesignCashFlow({ project }: { project: AnyProject }) {
  const projectId = Number(project.project_id);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSummary = useCallback((data: { summary: any; discountRate?: number } | null) => {
    setSummary(
      data?.summary
        ? {
            grossProfit: data.summary.grossProfit,
            irr: data.summary.irr,
            peakEquity: data.summary.peakEquity,
            npv: data.summary.npv,
            discountRate: data.discountRate,
          }
        : null,
    );
  }, []);

  return (
    <div className="ds-page ds-cfskin">
      <aside className="ds-cfskin-assume">
        <UnifiedAssumptionsPanel projectId={projectId} propertyType="land_dev" cashFlowSummary={summary ?? undefined} />
        <p className="ds-footnote">Revenue and costs are the model&apos;s own — parcel schedule and budget; only these overlays live here.</p>
      </aside>
      <div className="ds-cfskin-main">
        <CashFlowAnalysisTab
          projectId={projectId}
          exportButton={<ExportButton tabName="Feasibility-CashFlow" projectId={String(projectId)} />}
          onSummaryChange={onSummary}
        />
      </div>
    </div>
  );
}

export default DesignCashFlow;
