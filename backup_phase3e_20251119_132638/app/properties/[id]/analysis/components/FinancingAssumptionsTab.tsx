'use client';

// ============================================================================
// TAB 4: FINANCING ASSUMPTIONS
// ============================================================================
// Purpose: Debt, equity, and exit assumptions with Calculate button
// Data: tbl_debt_assumption, tbl_equity_structure, tbl_cre_exit_assumption
// ============================================================================

import { useState, useEffect } from 'react';
import { FinancingAssumptions, AnalysisViewSettings, CalculationStatus } from '../types/analysis.types';

interface FinancingAssumptionsTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  onComplete: (isComplete: boolean) => void;
  onCalculate: () => void;
  calculationStatus: CalculationStatus;
  onPrev: () => void;
}

export function FinancingAssumptionsTab({
  propertyId,
  viewSettings,
  onComplete,
  onCalculate,
  calculationStatus,
  onPrev,
}: FinancingAssumptionsTabProps) {
  const [assumptions, setAssumptions] = useState<FinancingAssumptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data
    const mockAssumptions: FinancingAssumptions = {
      acquisition: {
        purchase_price: 42500000,
        closing_costs: 850000,
        due_diligence_costs: 150000,
        total_acquisition_cost: 43500000,
      },
      debt: {
        loan_amount: 29750000,
        ltv_pct: 70.0,
        interest_rate_pct: 5.75,
        amortization_years: 25,
        loan_term_years: 10,
        io_period_months: 0,
        annual_debt_service: 2510000,
      },
      equity: {
        total_equity: 13750000,
        lp_equity: 12375000,
        gp_equity: 1375000,
        lp_pct: 90.0,
        gp_pct: 10.0,
        preferred_return_pct: 8.0,
        gp_promote_tiers: [
          { tier_number: 1, irr_threshold_pct: 8.0, lp_split_pct: 90.0, gp_split_pct: 10.0 },
          { tier_number: 2, irr_threshold_pct: 12.0, lp_split_pct: 80.0, gp_split_pct: 20.0 },
          { tier_number: 3, irr_threshold_pct: 16.0, lp_split_pct: 70.0, gp_split_pct: 30.0 },
        ],
      },
      exit: {
        hold_period_years: 10,
        exit_cap_rate_pct: 6.75,
        selling_costs_pct: 2.5,
        exit_year: 10,
      },
    };

    setAssumptions(mockAssumptions);
    setLoading(false);
    setTimeout(() => onComplete(true), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  if (loading || !assumptions) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Financing Assumptions</h2>
          <p className="text-sm text-gray-400 mt-1">Debt structure, equity waterfall, and exit assumptions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onPrev} className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            ← Previous
          </button>
          <button
            onClick={onCalculate}
            disabled={calculationStatus.is_calculating}
            className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {calculationStatus.is_calculating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Calculating...
              </>
            ) : (
              <>
                <span className="text-lg">▶</span>
                Calculate Cash Flow
              </>
            )}
          </button>
        </div>
      </div>

      {/* Acquisition Summary */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Acquisition Costs</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-blue-800 border border-blue-600 rounded">
            <div className="text-sm text-gray-400">Purchase Price</div>
            <div className="text-2xl font-semibold text-white mt-1">
              ${(assumptions.acquisition.purchase_price / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="p-4 bg-gray-800 border border-gray-800 rounded">
            <div className="text-sm text-gray-400">Closing Costs</div>
            <div className="text-2xl font-semibold text-white mt-1">
              ${(assumptions.acquisition.closing_costs / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="p-4 bg-gray-800 border border-gray-800 rounded">
            <div className="text-sm text-gray-400">Due Diligence</div>
            <div className="text-2xl font-semibold text-white mt-1">
              ${(assumptions.acquisition.due_diligence_costs / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="p-4 bg-purple-800 border border-purple-600 rounded">
            <div className="text-sm text-gray-400">Total Acquisition</div>
            <div className="text-2xl font-semibold text-white mt-1">
              ${(assumptions.acquisition.total_acquisition_cost / 1000000).toFixed(1)}M
            </div>
          </div>
        </div>
      </div>

      {/* Debt Structure */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Debt Structure</h3>
        <div className="p-4 border border-gray-800 rounded space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Loan Amount:</span>
              <span className="font-medium">${(assumptions.debt.loan_amount / 1000000).toFixed(2)}M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">LTV:</span>
              <span className="font-medium">{assumptions.debt.ltv_pct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Interest Rate:</span>
              <span className="font-medium">{assumptions.debt.interest_rate_pct}%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Amortization:</span>
              <span className="font-medium">{assumptions.debt.amortization_years} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Loan Term:</span>
              <span className="font-medium">{assumptions.debt.loan_term_years} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Annual Debt Service:</span>
              <span className="font-medium">${(assumptions.debt.annual_debt_service / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equity Structure */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Equity Structure</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-gray-800 rounded">
            <div className="text-sm text-gray-400 mb-3">Capital Stack</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Equity:</span>
                <span className="font-medium">${(assumptions.equity.total_equity / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span>LP Equity ({assumptions.equity.lp_pct}%):</span>
                <span className="font-medium">${(assumptions.equity.lp_equity / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span>GP Equity ({assumptions.equity.gp_pct}%):</span>
                <span className="font-medium">${(assumptions.equity.gp_equity / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span>Preferred Return:</span>
                <span className="font-medium text-white">{assumptions.equity.preferred_return_pct}%</span>
              </div>
            </div>
          </div>
          <div className="p-4 border border-gray-800 rounded">
            <div className="text-sm text-gray-400 mb-3">GP Promote Waterfall</div>
            <div className="space-y-2 text-sm">
              {assumptions.equity.gp_promote_tiers.map((tier) => (
                <div key={tier.tier_number} className="flex justify-between">
                  <span>IRR ≥ {tier.irr_threshold_pct}%:</span>
                  <span className="font-medium">LP {tier.lp_split_pct}% / GP {tier.gp_split_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Assumptions */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Exit Assumptions</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Hold Period</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {assumptions.exit.hold_period_years} years
            </div>
          </div>
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Exit Cap Rate</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {assumptions.exit.exit_cap_rate_pct}%
            </div>
          </div>
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Selling Costs</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {assumptions.exit.selling_costs_pct}%
            </div>
          </div>
        </div>
      </div>

      {/* Calculate Button (Large) */}
      <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Ready to Calculate?</h3>
            <p className="text-sm text-gray-400 mt-1">
              All input tabs complete. Click to run 10-year cash flow projection.
            </p>
          </div>
          <button
            onClick={onCalculate}
            disabled={calculationStatus.is_calculating}
            className="px-8 py-4 text-lg bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg"
          >
            {calculationStatus.is_calculating ? (
              <>
                <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full" />
                Calculating...
              </>
            ) : (
              <>
                <span className="text-2xl">▶</span>
                Calculate Cash Flow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
