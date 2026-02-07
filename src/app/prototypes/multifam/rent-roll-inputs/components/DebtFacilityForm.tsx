'use client';

import React, { useEffect } from 'react';

interface Loan {
  loan_id?: string;
  loan_name: string;
  lender_name?: string;
  loan_amount: number;
  interest_rate_pct: number;
  loan_term_years: number;
  amortization_years?: number;
  is_construction_loan?: boolean;
  interest_type?: string;
  interest_spread_bps?: number;
  rate_floor_pct?: number;
  rate_cap_pct?: number;
  interest_index?: string;
  rate_reset_frequency?: string;
  loan_to_value_pct?: number;
  commitment_fee_pct?: number;
  extension_fee_bps?: number;
  prepayment_penalty_years?: number;
  exit_fee_pct?: number;
  guarantee_type?: string;
  guarantor_name?: string;
  loan_covenant_dscr_min?: number;
  loan_covenant_ltv_max?: number;
  loan_covenant_occupancy_min?: number;
  covenant_test_frequency?: string;
  reserve_requirements?: any;
  replacement_reserve_per_unit?: number;
  tax_insurance_escrow_months?: number;
  initial_reserve_months?: number;
  recourse_carveout_provisions?: string;
  commitment_balance?: number;
  drawn_to_date?: number;
  extension_options?: number;
  extension_option_years?: number;
  monthly_payment?: number;
  annual_debt_service?: number;
}

interface LoanFormProps {
  facility: Loan | null;
  mode: 'basic' | 'standard' | 'advanced';
  onSave: (facility: Loan) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function LoanForm({ facility, mode, onSave, onCancel, isSaving }: LoanFormProps) {
  const defaultFormData: Loan = {
    loan_name: '',
    loan_amount: 0,
    interest_rate_pct: 0,
    loan_term_years: 0,
  };

  const [formData, setFormData] = React.useState<Loan>(
    facility
      ? {
          ...defaultFormData,
          ...facility,
          loan_amount: facility.loan_amount ?? 0,
          interest_rate_pct: facility.interest_rate_pct ?? 0,
          loan_term_years: facility.loan_term_years ?? 0,
        }
      : defaultFormData
  );

  useEffect(() => {
    if (facility) {
      setFormData({
        ...defaultFormData,
        ...facility,
        loan_amount: facility.loan_amount ?? 0,
        interest_rate_pct: facility.interest_rate_pct ?? 0,
        loan_term_years: facility.loan_term_years ?? 0,
      });
    } else {
      setFormData(defaultFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  const updateField = (field: keyof Loan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-semibold text-white">
            {facility ? 'Edit Loan' : 'Add Loan'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* BASIC FIELDS - Always visible */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Loan Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.loan_name}
                    onChange={(e) => updateField('loan_name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lender Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.lender_name || ''}
                    onChange={(e) => updateField('lender_name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Loan Amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.loan_amount ?? ''}
                    onChange={(e) => updateField('loan_amount', Number(e.target.value))}
                  />
                  {formData.loan_amount > 0 && (
                    <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.loan_amount)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Interest Rate (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.interest_rate_pct ?? ''}
                    onChange={(e) => updateField('interest_rate_pct', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Loan Term (Years) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.loan_term_years ?? ''}
                    onChange={(e) => updateField('loan_term_years', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amortization (Years)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.amortization_years ?? ''}
                    onChange={(e) => updateField('amortization_years', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_construction_loan"
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    checked={formData.is_construction_loan || false}
                    onChange={(e) => updateField('is_construction_loan', e.target.checked)}
                  />
                  <label htmlFor="is_construction_loan" className="ml-2 text-sm font-medium text-gray-300">
                    Construction Loan
                  </label>
                </div>
              </div>
            </section>

            {/* STANDARD FIELDS */}
            {mode !== 'basic' && (
              <>
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Rate Structure
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rate Type
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.interest_type || 'fixed'}
                        onChange={(e) => updateField('interest_type', e.target.value)}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="floating">Floating</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    {formData.interest_type === 'floating' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Index Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., SOFR, Prime"
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.interest_index || ''}
                            onChange={(e) => updateField('interest_index', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Spread Over Index (bps)
                          </label>
                          <input
                            type="number"
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.interest_spread_bps ?? ''}
                            onChange={(e) => updateField('interest_spread_bps', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Rate Floor (%)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.rate_floor_pct ?? ''}
                            onChange={(e) => updateField('rate_floor_pct', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Rate Cap (%)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.rate_cap_pct ?? ''}
                            onChange={(e) => updateField('rate_cap_pct', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Rate Reset Frequency
                          </label>
                          <select
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.rate_reset_frequency || ''}
                            onChange={(e) => updateField('rate_reset_frequency', e.target.value)}
                          >
                            <option value="">Select frequency</option>
                            <option value="Daily">Daily</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Semi-Annual">Semi-Annual</option>
                            <option value="Annual">Annual</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Underwriting Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        LTV (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.loan_to_value_pct ?? ''}
                        onChange={(e) => updateField('loan_to_value_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Fees & Prepayment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Commitment Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.commitment_fee_pct ?? ''}
                        onChange={(e) => updateField('commitment_fee_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Extension Fee (bps)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.extension_fee_bps ?? ''}
                        onChange={(e) => updateField('extension_fee_bps', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Prepayment Penalty (Years)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.prepayment_penalty_years ?? ''}
                        onChange={(e) => updateField('prepayment_penalty_years', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Exit Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.exit_fee_pct ?? ''}
                        onChange={(e) => updateField('exit_fee_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Guarantees
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Guarantee Type
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.guarantee_type || ''}
                        onChange={(e) => updateField('guarantee_type', e.target.value)}
                      >
                        <option value="">None</option>
                        <option value="Full Recourse">Full Recourse</option>
                        <option value="Non-Recourse">Non-Recourse</option>
                        <option value="Carve-Out">Carve-Out</option>
                        <option value="Limited">Limited</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Guarantor Name
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.guarantor_name || ''}
                        onChange={(e) => updateField('guarantor_name', e.target.value)}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ADVANCED FIELDS */}
            {mode === 'advanced' && (
              <>
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Loan Covenants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum DSCR Covenant
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.loan_covenant_dscr_min ?? ''}
                        onChange={(e) => updateField('loan_covenant_dscr_min', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Maximum LTV Covenant (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.loan_covenant_ltv_max ?? ''}
                        onChange={(e) => updateField('loan_covenant_ltv_max', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Occupancy Covenant (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.loan_covenant_occupancy_min ?? ''}
                        onChange={(e) => updateField('loan_covenant_occupancy_min', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Covenant Test Frequency
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.covenant_test_frequency || 'Quarterly'}
                        onChange={(e) => updateField('covenant_test_frequency', e.target.value)}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Semi-Annual">Semi-Annual</option>
                        <option value="Annual">Annual</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Reserves & Escrows
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Replacement Reserve (per unit)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.replacement_reserve_per_unit ?? ''}
                        onChange={(e) => updateField('replacement_reserve_per_unit', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tax/Insurance Escrow (Months)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.tax_insurance_escrow_months ?? ''}
                        onChange={(e) => updateField('tax_insurance_escrow_months', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Initial Reserve (Months)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.initial_reserve_months ?? ''}
                        onChange={(e) => updateField('initial_reserve_months', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Recourse Carveout Provisions
                      </label>
                      <textarea
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.recourse_carveout_provisions || ''}
                        onChange={(e) => updateField('recourse_carveout_provisions', e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Commitment & Extensions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Commitment Balance
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.commitment_balance ?? ''}
                        onChange={(e) => updateField('commitment_balance', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Drawn to Date
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.drawn_to_date ?? ''}
                        onChange={(e) => updateField('drawn_to_date', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Extension Options (Count)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.extension_options ?? ''}
                        onChange={(e) => updateField('extension_options', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Extension Option Term (Years)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.extension_option_years ?? ''}
                        onChange={(e) => updateField('extension_option_years', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Payment Calculations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Monthly Payment
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.monthly_payment ?? ''}
                        onChange={(e) => updateField('monthly_payment', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.monthly_payment && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.monthly_payment)}/mo</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Annual Debt Service
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.annual_debt_service ?? ''}
                        onChange={(e) => updateField('annual_debt_service', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.annual_debt_service && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.annual_debt_service)}/yr</div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-850">
          <div className="text-sm text-gray-400">
            <span className="text-red-400">*</span> Required fields
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Loan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
