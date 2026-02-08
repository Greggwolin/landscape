'use client';

// ============================================================================
// TAB 6: INVESTMENT RETURNS (COMPUTED)
// ============================================================================
// Purpose: Display IRR, NPV, equity multiple, LP/GP returns
// API: GET /api/cre/properties/:id/investment-metrics
// ============================================================================

import { useState, useEffect } from 'react';
import { InvestmentMetrics, AnalysisViewSettings, CalculationStatus } from '../types/analysis.types';

interface InvestmentReturnsTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  calculationStatus: CalculationStatus;
  onNext: () => void;
  onPrev: () => void;
}

export function InvestmentReturnsTab({
  propertyId,
  viewSettings,
  calculationStatus,
  onNext,
  onPrev,
}: InvestmentReturnsTabProps) {
  const [metrics, setMetrics] = useState<InvestmentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calculationStatus.last_calculated) {
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/cre/properties/${propertyId}/investment-metrics`);
        // const data = await response.json();

        const mockMetrics: InvestmentMetrics = {
          levered_irr: 0.1423,
          levered_npv: 8750000,
          levered_equity_multiple: 2.35,
          unlevered_irr: 0.1184,
          unlevered_npv: 6200000,
          unlevered_equity_multiple: 1.82,
          cash_on_cash_year_1: 0.089,
          cash_on_cash_stabilized: 0.104,
          avg_dscr: 1.85,
          min_dscr: 1.62,
          max_dscr: 2.14,
          lp_irr: 0.138,
          lp_equity_multiple: 2.28,
          lp_total_distributions: 28200000,
          gp_irr: 0.185,
          gp_equity_multiple: 3.15,
          gp_total_distributions: 4330000,
          gp_promote_total: 1850000,
          exit_value: 54800000,
          exit_proceeds: 53470000,
          gain_on_sale: 10970000,
        };

        setMetrics(mockMetrics);
        setError(null);
      } catch (err) {
        console.error('Failed to load investment metrics:', err);
        setError('Failed to load investment returns');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [propertyId, calculationStatus.last_calculated]);

  const formatPercent = (decimal: number): string => {
    return `${(decimal * 100).toFixed(2)}%`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!calculationStatus.last_calculated) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-semibold text-white mb-2">Returns Not Calculated</h3>
        <p className="text-gray-400 mb-4">Run calculations to see investment returns.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  if (error || !metrics) {
    return <div className="p-4 bg-red-800 border border-red-600 rounded text-white">{error || 'No data'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Investment Returns</h2>
          <p className="text-sm text-gray-400 mt-1">IRR, NPV, equity multiple, and LP/GP returns</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onPrev} className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            ← Previous
          </button>
          <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Next: Sensitivity Analysis →
          </button>
        </div>
      </div>

      {/* Levered Returns */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Levered Returns (With Debt)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-6 bg-blue-800 border border-blue-600 rounded-lg">
            <div className="text-sm text-blue-200 mb-1">Levered IRR</div>
            <div className="text-4xl font-bold text-white">{formatPercent(metrics.levered_irr)}</div>
            <div className="text-xs text-blue-200 mt-2">Target: 12-15%</div>
          </div>
          <div className="p-6 bg-emerald-800 border border-emerald-600 rounded-lg">
            <div className="text-sm text-emerald-200 mb-1">Equity Multiple</div>
            <div className="text-4xl font-bold text-white">{metrics.levered_equity_multiple.toFixed(2)}x</div>
            <div className="text-xs text-emerald-200 mt-2">Target: 2.0x+</div>
          </div>
          <div className="p-6 bg-purple-800 border border-purple-600 rounded-lg">
            <div className="text-sm text-purple-200 mb-1">NPV</div>
            <div className="text-3xl font-bold text-white">{formatCurrency(metrics.levered_npv)}</div>
            <div className="text-xs text-purple-200 mt-2">@ 10% discount</div>
          </div>
        </div>
      </div>

      {/* Unlevered Returns */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Unlevered Returns (Without Debt)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 border border-gray-800 rounded">
            <div className="text-sm text-gray-400">Unlevered IRR</div>
            <div className="text-2xl font-semibold text-white mt-1">{formatPercent(metrics.unlevered_irr)}</div>
          </div>
          <div className="p-4 bg-gray-800 border border-gray-800 rounded">
            <div className="text-sm text-gray-400">Equity Multiple</div>
            <div className="text-2xl font-semibold text-white mt-1">{metrics.unlevered_equity_multiple.toFixed(2)}x</div>
          </div>
          <div className="p-4 bg-gray-800 border border-gray-800 rounded">
            <div className="text-sm text-gray-400">NPV</div>
            <div className="text-2xl font-semibold text-white mt-1">{formatCurrency(metrics.unlevered_npv)}</div>
          </div>
        </div>
      </div>

      {/* Debt Metrics */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Debt Service Coverage</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-amber-700 border border-amber-600 rounded">
            <div className="text-sm text-gray-400">Average DSCR</div>
            <div className="text-2xl font-semibold text-white mt-1">{metrics.avg_dscr.toFixed(2)}x</div>
            <div className="text-xs text-gray-500 mt-1">Lender min: 1.25x</div>
          </div>
          <div className="p-4 bg-amber-700 border border-amber-600 rounded">
            <div className="text-sm text-gray-400">Minimum DSCR</div>
            <div className="text-2xl font-semibold text-white mt-1">{metrics.min_dscr.toFixed(2)}x</div>
          </div>
          <div className="p-4 bg-amber-700 border border-amber-600 rounded">
            <div className="text-sm text-gray-400">Maximum DSCR</div>
            <div className="text-2xl font-semibold text-white mt-1">{metrics.max_dscr.toFixed(2)}x</div>
          </div>
        </div>
      </div>

      {/* LP vs GP Returns */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-3">LP Returns (90% Equity)</h3>
          <div className="p-6 border-2 border-blue-600 rounded-lg bg-blue-800">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-blue-700">
                <span className="text-sm text-blue-200">LP IRR</span>
                <span className="text-2xl font-bold text-white">{formatPercent(metrics.lp_irr)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-200">Equity Multiple</span>
                <span className="text-xl font-semibold text-white">{metrics.lp_equity_multiple.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-200">Total Distributions</span>
                <span className="text-xl font-semibold text-white">{formatCurrency(metrics.lp_total_distributions)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-white mb-3">GP Returns (10% Equity)</h3>
          <div className="p-6 border-2 border-emerald-600 rounded-lg bg-emerald-800">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-emerald-700">
                <span className="text-sm text-emerald-200">GP IRR</span>
                <span className="text-2xl font-bold text-white">{formatPercent(metrics.gp_irr)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-200">Equity Multiple</span>
                <span className="text-xl font-semibold text-white">{metrics.gp_equity_multiple.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-200">Total Distributions</span>
                <span className="text-xl font-semibold text-white">{formatCurrency(metrics.gp_total_distributions)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-emerald-700">
                <span className="text-sm text-white font-medium">Promote Earned</span>
                <span className="text-xl font-bold text-white">{formatCurrency(metrics.gp_promote_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Summary */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Exit Analysis (Year 10)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Exit Value</div>
            <div className="text-2xl font-semibold text-white mt-1">{formatCurrency(metrics.exit_value)}</div>
          </div>
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Net Proceeds</div>
            <div className="text-2xl font-semibold text-white mt-1">{formatCurrency(metrics.exit_proceeds)}</div>
          </div>
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Gain on Sale</div>
            <div className="text-2xl font-semibold text-white mt-1">{formatCurrency(metrics.gain_on_sale)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
