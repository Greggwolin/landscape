'use client';

// ============================================================================
// TAB 5: CASH FLOW PROJECTION (COMPUTED)
// ============================================================================
// Purpose: Display 10-year period-by-period cash flow projection
// API: GET /api/cre/properties/:id/cash-flow
// ============================================================================

import { useState, useEffect } from 'react';
import { CashFlowPeriod, CashFlowSummary, AnalysisViewSettings, CalculationStatus } from '../types/analysis.types';

interface CashFlowTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  calculationStatus: CalculationStatus;
  onNext: () => void;
  onPrev: () => void;
}

export function CashFlowTab({
  propertyId,
  viewSettings,
  calculationStatus,
  onNext,
  onPrev,
}: CashFlowTabProps) {
  const [cashFlows, setCashFlows] = useState<CashFlowPeriod[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calculationStatus.last_calculated) {
      return;
    }

    const fetchCashFlow = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/cre/properties/${propertyId}/cash-flow`);
        // const data = await response.json();

        // Mock data for 10 years
        const mockCashFlows: CashFlowPeriod[] = Array.from({ length: 10 }, (_, i) => ({
          period_number: i + 1,
          period_start_date: `${2025 + i}-01-01`,
          period_end_date: `${2025 + i}-12-31`,
          base_rent: 3200000 * Math.pow(1.025, i),
          percentage_rent: 150000,
          expense_recovery: 805000 * Math.pow(1.025, i),
          other_income: 50000,
          gross_revenue: 4205000 * Math.pow(1.025, i),
          vacancy_loss: -210250 * Math.pow(1.025, i),
          credit_loss: -84100 * Math.pow(1.025, i),
          effective_gross_income: 3910650 * Math.pow(1.025, i),
          property_taxes: 425000 * Math.pow(1.03, i),
          insurance: 95000 * Math.pow(1.05, i),
          utilities: 145000 * Math.pow(1.025, i),
          repairs_maintenance: 190000 * Math.pow(1.025, i),
          management_fee: 195500 * Math.pow(1.025, i),
          other_operating: 100000,
          total_operating_expenses: 1150500 * Math.pow(1.03, i),
          net_operating_income: 2760150 * Math.pow(1.025, i),
          tenant_improvements: i % 3 === 0 ? 120000 : 0,
          leasing_commissions: i % 3 === 0 ? 75000 : 0,
          capital_reserves: 80000,
          total_capital_expenses: i % 3 === 0 ? 275000 : 80000,
          debt_service: 2510000,
          interest_payment: 2510000 * 0.8,
          principal_payment: 2510000 * 0.2,
          cash_flow_before_tax: (2760150 * Math.pow(1.025, i)) - 2510000 - (i % 3 === 0 ? 275000 : 80000),
          lp_distribution: 0,
          gp_distribution: 0,
          total_distribution: 0,
        }));

        const mockSummary: CashFlowSummary = {
          total_revenue: mockCashFlows.reduce((sum, p) => sum + p.gross_revenue, 0),
          total_expenses: mockCashFlows.reduce((sum, p) => sum + p.total_operating_expenses, 0),
          total_noi: mockCashFlows.reduce((sum, p) => sum + p.net_operating_income, 0),
          total_debt_service: mockCashFlows.reduce((sum, p) => sum + p.debt_service, 0),
          total_cash_flow: mockCashFlows.reduce((sum, p) => sum + p.cash_flow_before_tax, 0),
          avg_occupancy: 97.6,
          avg_dscr: 1.85,
        };

        setCashFlows(mockCashFlows);
        setSummary(mockSummary);
        setError(null);
      } catch (err) {
        console.error('Failed to load cash flow:', err);
        setError('Failed to load cash flow projection');
      } finally {
        setLoading(false);
      }
    };

    fetchCashFlow();
  }, [propertyId, calculationStatus.last_calculated]);

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
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-white mb-2">Cash Flow Not Calculated</h3>
        <p className="text-gray-400 mb-4">Complete input tabs 1-4 and click "Calculate" to see projections.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-800 border border-red-600 rounded text-white">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Cash Flow Projection</h2>
          <p className="text-sm text-gray-400 mt-1">10-year period-by-period analysis</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            Export to Excel
          </button>
          <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Next: View Returns →
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-blue-800 border border-blue-600 rounded">
            <div className="text-sm text-gray-400">Total NOI (10yr)</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {formatCurrency(summary.total_noi)}
            </div>
          </div>
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Total Cash Flow (10yr)</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {formatCurrency(summary.total_cash_flow)}
            </div>
          </div>
          <div className="p-4 bg-purple-800 border border-purple-600 rounded">
            <div className="text-sm text-gray-400">Avg Occupancy</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {summary.avg_occupancy.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 bg-amber-700 border border-amber-600 rounded">
            <div className="text-sm text-gray-400">Avg DSCR</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {summary.avg_dscr.toFixed(2)}x
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Year</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Base Rent</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Recovery</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">EGI</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Opex</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase bg-blue-900">NOI</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Capex</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Debt Svc</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase bg-emerald-900">Cash Flow</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-200">
              {cashFlows.map((period) => (
                <tr key={period.period_number} className="hover:bg-gray-800">
                  <td className="px-3 py-2 font-medium text-white">{period.period_number}</td>
                  <td className="px-3 py-2 text-right text-white">{formatCurrency(period.base_rent)}</td>
                  <td className="px-3 py-2 text-right text-white">{formatCurrency(period.expense_recovery)}</td>
                  <td className="px-3 py-2 text-right text-white">{formatCurrency(period.effective_gross_income)}</td>
                  <td className="px-3 py-2 text-right text-red-100">({formatCurrency(period.total_operating_expenses)})</td>
                  <td className="px-3 py-2 text-right font-semibold text-white bg-blue-900">
                    {formatCurrency(period.net_operating_income)}
                  </td>
                  <td className="px-3 py-2 text-right text-red-100">({formatCurrency(period.total_capital_expenses)})</td>
                  <td className="px-3 py-2 text-right text-red-100">({formatCurrency(period.debt_service)})</td>
                  <td className="px-3 py-2 text-right font-semibold text-white bg-emerald-900">
                    {formatCurrency(period.cash_flow_before_tax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
