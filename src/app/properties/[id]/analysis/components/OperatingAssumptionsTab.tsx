'use client';

// ============================================================================
// TAB 3: OPERATING ASSUMPTIONS
// ============================================================================
// Purpose: Operating expenses, vacancy, capital reserves, TI/leasing costs
// Data: tbl_cre_operating_expense, tbl_cre_capital_reserve
// ============================================================================

import { useState, useEffect } from 'react';
import { OperatingAssumptions, AnalysisViewSettings } from '../types/analysis.types';

interface OperatingAssumptionsTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  onComplete: (isComplete: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function OperatingAssumptionsTab({
  propertyId,
  viewSettings,
  onComplete,
  onNext,
  onPrev,
}: OperatingAssumptionsTabProps) {
  const [assumptions, setAssumptions] = useState<OperatingAssumptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data
    const mockAssumptions: OperatingAssumptions = {
      expenses: [
        { expense_id: 1, expense_category: 'Property Taxes', annual_amount: 425000, psf_annual: 4.50, is_recoverable: true, recovery_pct: 100, escalation_pct: 3.0, notes: null },
        { expense_id: 2, expense_category: 'Insurance', annual_amount: 95000, psf_annual: 1.00, is_recoverable: true, recovery_pct: 100, escalation_pct: 5.0, notes: null },
        { expense_id: 3, expense_category: 'CAM', annual_amount: 285000, psf_annual: 3.00, is_recoverable: true, recovery_pct: 100, escalation_pct: 2.5, notes: null },
        { expense_id: 4, expense_category: 'Management Fee', annual_amount: 185000, psf_annual: 1.95, is_recoverable: false, recovery_pct: 0, escalation_pct: 0, notes: '5% of EGI' },
      ],
      vacancy: {
        vacancy_pct: 5.0,
        credit_loss_pct: 2.0,
        absorption_months_new_lease: 6,
        absorption_months_renewal: 3,
      },
      capital_reserves: [
        { reserve_id: 1, reserve_type: 'Roof Replacement', annual_contribution: 50000, psf_annual: 0.53, balance_current: 150000 },
        { reserve_id: 2, reserve_type: 'Parking Lot Resurface', annual_contribution: 30000, psf_annual: 0.32, balance_current: 90000 },
      ],
      ti_leasing: {
        ti_psf_new_lease: 40.0,
        ti_psf_renewal: 10.0,
        leasing_commission_pct_new: 6.0,
        leasing_commission_pct_renewal: 3.0,
        legal_costs_per_lease: 5000,
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

  const totalOpex = assumptions.expenses.reduce((sum, e) => sum + e.annual_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Operating Assumptions</h2>
          <p className="text-sm text-gray-400 mt-1">Operating expenses and capital reserves</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onPrev} className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            ← Previous
          </button>
          <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Next: Define Financing →
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-800 border border-blue-600 rounded">
          <div className="text-sm text-gray-400">Total Operating Expenses</div>
          <div className="text-2xl font-semibold text-white mt-1">
            ${(totalOpex / 1000000).toFixed(2)}M
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${(totalOpex / 93300).toFixed(2)}/SF
          </div>
        </div>
        <div className="p-4 bg-amber-700 border border-amber-600 rounded">
          <div className="text-sm text-gray-400">Vacancy & Credit Loss</div>
          <div className="text-2xl font-semibold text-white mt-1">
            {assumptions.vacancy.vacancy_pct + assumptions.vacancy.credit_loss_pct}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {assumptions.vacancy.vacancy_pct}% vacancy + {assumptions.vacancy.credit_loss_pct}% credit
          </div>
        </div>
        <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
          <div className="text-sm text-gray-400">Annual Capital Reserves</div>
          <div className="text-2xl font-semibold text-white mt-1">
            ${assumptions.capital_reserves.reduce((sum, r) => sum + r.annual_contribution, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${assumptions.capital_reserves.reduce((sum, r) => sum + r.psf_annual, 0).toFixed(2)}/SF
          </div>
        </div>
      </div>

      {/* Operating Expenses Table */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Operating Expenses</h3>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Annual Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">$/SF</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Recoverable</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Escalation</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-200">
              {assumptions.expenses.map((expense) => (
                <tr key={expense.expense_id} className="hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm font-medium text-white">{expense.expense_category}</td>
                  <td className="px-4 py-3 text-sm text-right text-white">${expense.annual_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-white">${expense.psf_annual.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {expense.is_recoverable ? (
                      <span className="px-2 py-1 text-xs bg-emerald-800 text-white rounded-full">
                        {expense.recovery_pct}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-white">{expense.escalation_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TI & Leasing Costs */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">TI & Leasing Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-gray-800 rounded">
            <div className="text-sm text-gray-400 mb-2">Tenant Improvements</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>New Lease:</span>
                <span className="font-medium">${assumptions.ti_leasing.ti_psf_new_lease.toFixed(2)}/SF</span>
              </div>
              <div className="flex justify-between">
                <span>Renewal:</span>
                <span className="font-medium">${assumptions.ti_leasing.ti_psf_renewal.toFixed(2)}/SF</span>
              </div>
            </div>
          </div>
          <div className="p-4 border border-gray-800 rounded">
            <div className="text-sm text-gray-400 mb-2">Leasing Commissions</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>New Lease:</span>
                <span className="font-medium">{assumptions.ti_leasing.leasing_commission_pct_new}%</span>
              </div>
              <div className="flex justify-between">
                <span>Renewal:</span>
                <span className="font-medium">{assumptions.ti_leasing.leasing_commission_pct_renewal}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
