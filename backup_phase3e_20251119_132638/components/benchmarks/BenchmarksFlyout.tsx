'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import LandscaperPanel from './LandscaperPanel';
import type {
  AISuggestion,
  Benchmark,
  BenchmarkCategory,
  GrowthRateSet,
  GrowthRateStep,
  AbsorptionVelocity,
} from '@/types/benchmarks';

export type BenchmarksFlyoutSelection =
  | { kind: 'growth_rate'; set: GrowthRateSet }
  | { kind: 'benchmark'; category: BenchmarkCategory; benchmark: Benchmark }
  | { kind: 'absorption'; record: AbsorptionVelocity };

interface BenchmarksFlyoutProps {
  selection: BenchmarksFlyoutSelection | null;
  aiSuggestions: AISuggestion[];
  onRefresh: () => void;
}

export default function BenchmarksFlyout({ selection, aiSuggestions, onRefresh }: BenchmarksFlyoutProps) {
  if (!selection) {
    return (
      <LandscaperPanel
        selectedCategory={null}
        aiSuggestions={aiSuggestions}
        onRefresh={onRefresh}
      />
    );
  }

  const impact = useMemo(() => buildImpact(selection), [selection]);
  const relatedSuggestions = useMemo(() => selectRelatedSuggestions(selection, aiSuggestions), [selection, aiSuggestions]);
  const hasCustomSteps = selection.kind === 'growth_rate' && selection.set.rate_type === 'stepped' && (selection.set.steps?.length ?? 0) > 0;

  return (
    <div className="h-full overflow-y-auto bg-surface-card px-6 py-6">
      <header className="mb-4 border-b border-line-soft pb-3">
        <p className="text-xs uppercase tracking-wide text-text-secondary">Selected Tile</p>
        <h2 className="text-xl font-semibold text-text-primary">{getSelectionTitle(selection)}</h2>
        <p className="text-sm text-text-secondary">{getSelectionSubtitle(selection)}</p>
      </header>

      {hasCustomSteps ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <StepsColumn steps={selection.set.steps ?? []} />
          <div className="space-y-4">
            <ImpactCard impact={impact} />
            <LandscaperAnalysis selection={selection} suggestions={relatedSuggestions} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ImpactCard impact={impact} />
          <LandscaperAnalysis selection={selection} suggestions={relatedSuggestions} />
        </div>
      )}
    </div>
  );
}

interface ImpactCardProps {
  impact: {
    amount: string;
    pct: string;
    irr: string;
  };
}

function ImpactCard({ impact }: ImpactCardProps) {
  return (
    <div className="rounded border border-line-soft bg-surface-card shadow-sm">
      <div className="border-b border-line-soft bg-brand-primary/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-brand-primary">Impact / IRR</h3>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <ImpactMetric label="$ Amount" value={impact.amount} />
          <ImpactMetric label="% of Project" value={impact.pct} />
          <ImpactMetric label="IRR Impact" value={impact.irr} />
        </div>
        <div className="rounded border border-dashed border-line-soft p-4 text-center text-sm text-text-secondary">
          Impact Analysis Chart Placeholder
        </div>
        <div className="flex flex-wrap gap-2">
          {['Edit', 'Copy', 'Export'].map((label) => (
            <button
              key={label}
              className="rounded border border-line-soft px-3 py-1 text-sm text-text-primary hover:bg-surface-card/80"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function StepsColumn({ steps }: { steps: GrowthRateStep[] }) {
  if (!steps.length) {
    return (
      <div className="rounded border border-line-soft bg-surface-card/60 p-4 text-sm text-text-secondary">
        No custom steps configured.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded border border-line-soft bg-surface-card/60 p-4">
      <h3 className="text-sm font-semibold text-text-primary">Custom Steps</h3>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.step_number} className="rounded border border-line-soft bg-surface-card/80 p-3">
            <div className="flex flex-wrap items-center justify-between text-sm font-medium text-text-primary">
              <span>Step {step.step_number}</span>
              <span>{formatRate(step.rate)}%</span>
            </div>
            <p className="text-xs text-text-secondary">
              Period {step.from_period} → {formatThru(step.thru_period)} • {describePeriods(step.periods)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function describePeriods(periods: number | 'E') {
  if (periods === 'E') return 'Perpetual';
  return `${periods} period${periods === 1 ? '' : 's'}`;
}

function formatThru(value: number | null | undefined) {
  if (value === null || value === undefined) return '∞';
  return value;
}

function formatRate(rate: number | null | undefined) {
  // Rate comes as decimal (0.03 = 3%), convert to percentage for display
  if (rate === null || rate === undefined) {
    return '0.00';
  }
  // Convert to number if it's a string
  const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (typeof numRate !== 'number' || isNaN(numRate)) {
    return '0.00';
  }
  // Multiply by 100 to convert decimal to percentage (0.03 -> 3.00)
  return (numRate * 100).toFixed(2);
}

function LandscaperAnalysis({ selection, suggestions }: { selection: BenchmarksFlyoutSelection; suggestions: AISuggestion[] }) {
  return (
    <div className="rounded border border-line-soft bg-surface-card p-4">
      <h3 className="text-sm font-semibold text-text-primary">Landscaper Analysis</h3>
      {suggestions.length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">
          Landscaper hasn&#39;t extracted commentary for <strong>{getSelectionTitle(selection)}</strong> yet. Upload a supporting image or document to generate guidance.
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          {suggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.suggestion_id} className="rounded border border-line-soft bg-surface-card/70 p-3">
              <p className="font-medium text-text-primary">{suggestion.suggested_name}</p>
              <p className="text-xs text-text-secondary">Confidence {(suggestion.confidence_score ?? 0) * 100}%</p>
              <p className="mt-1 text-text-secondary">
                Suggested value {formatSuggestionValue(suggestion)} · Variance {formatVariance(suggestion.variance_percentage)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSuggestionValue(suggestion: AISuggestion) {
  if (typeof suggestion.suggested_value !== 'number') return '—';
  return suggestion.suggested_uom?.includes('%')
    ? `${suggestion.suggested_value.toFixed(2)}${suggestion.suggested_uom}`
    : formatCurrency(suggestion.suggested_value);
}

function formatVariance(value?: number | null) {
  if (typeof value !== 'number') return '—';
  const pct = (Math.round(value * 100) / 100).toFixed(2);
  return `${pct}%`;
}

function buildImpact(selection: BenchmarksFlyoutSelection) {
  switch (selection.kind) {
    case 'growth_rate': {
      const ratePct = typeof selection.set.current_rate === 'number' ? `${(selection.set.current_rate * 100).toFixed(2)}%` : '—';
      return {
        amount: formatCurrency((selection.set.current_rate ?? 0.02) * 5_000_000),
        pct: ratePct,
        irr: selection.set.rate_type === 'stepped' ? '+45 bps' : '+20 bps',
      };
    }
    case 'benchmark': {
      return {
        amount: formatCurrency(selection.benchmark.value ?? 0),
        pct: selection.benchmark.value ? `${(selection.benchmark.value / 1_000_000 * 100).toFixed(2)}%` : '—',
        irr: selection.benchmark.value ? `${(selection.benchmark.value / 10000).toFixed(1)} bps` : '+0 bps',
      };
    }
    case 'absorption': {
      return {
        amount: formatCurrency(selection.record.velocity_annual * 15000),
        pct: `${selection.record.velocity_annual} units/yr`,
        irr: selection.record.project_scale ? `${selection.record.project_scale.toUpperCase()} impact` : '+10 bps',
      };
    }
    default:
      return { amount: '—', pct: '—', irr: '—' };
  }
}

function getSelectionTitle(selection: BenchmarksFlyoutSelection) {
  switch (selection.kind) {
    case 'growth_rate':
      return selection.set.set_name;
    case 'benchmark':
      return selection.benchmark.benchmark_name;
    case 'absorption':
      return selection.record.market_geography || 'Absorption Velocity';
  }
}

function getSelectionSubtitle(selection: BenchmarksFlyoutSelection) {
  switch (selection.kind) {
    case 'growth_rate':
      return selection.set.market_geography || 'Global growth rate';
    case 'benchmark':
      return selection.category.label;
    case 'absorption':
      return `${selection.record.velocity_annual.toLocaleString()} units/year`;
  }
}

function selectRelatedSuggestions(selection: BenchmarksFlyoutSelection, suggestions: AISuggestion[]) {
  const key = selection.kind === 'absorption' ? 'absorption' : selection.kind === 'benchmark' ? selection.category.key : 'growth_rate';
  return suggestions.filter((suggestion) => suggestion.category === key);
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
