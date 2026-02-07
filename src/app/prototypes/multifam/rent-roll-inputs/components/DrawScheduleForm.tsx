'use client';

import React from 'react';

interface FacilityOption {
  value: string;
  label: string;
}

interface DrawScheduleItem {
  draw_id?: number;
  loan_id?: string | number;
  period_name: string;
  draw_number?: number;
  draw_amount: number;
  outstanding_balance?: number;
  draw_purpose: string;
  interest_rate_pct?: number;
  interest_expense?: number;
  interest_paid?: number;
  deferred_interest?: number;
  unused_fee_charge?: number;
  commitment_fee_charge?: number;
  other_fees?: number;
  draw_date: string;
  request_date?: string;
  approval_date?: string;
  funding_date?: string;
  inspector_approval?: boolean;
  lender_approval?: boolean;
}

interface DrawScheduleFormProps {
  draw: DrawScheduleItem | null;
  mode: 'basic' | 'standard' | 'advanced';
  onSave: (draw: DrawScheduleItem) => void;
  onCancel: () => void;
  isSaving: boolean;
  facilityOptions?: FacilityOption[];
}

export default function DrawScheduleForm({
  draw,
  mode,
  onSave,
  onCancel,
  isSaving,
  facilityOptions = []
}: DrawScheduleFormProps) {
  const defaultFacilityId = draw?.loan_id ?? facilityOptions[0]?.value;

  const [formData, setFormData] = React.useState<DrawScheduleItem>({
    loan_id: defaultFacilityId,
    period_name: '',
    draw_amount: 0,
    draw_purpose: '',
    draw_date: new Date().toISOString().split('T')[0],
    ...draw,
  });

  React.useEffect(() => {
    if (!formData.loan_id && defaultFacilityId) {
      setFormData((prev) => ({ ...prev, loan_id: defaultFacilityId }));
    }
  }, [defaultFacilityId, formData.loan_id]);

  const updateField = (field: keyof DrawScheduleItem, value: any) => {
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
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-semibold text-white">
            {draw ? 'Edit Draw Schedule Item' : 'Add Draw Schedule Item'}
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
            {/* BASIC FIELDS */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {facilityOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Loan <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.loan_id || ''}
                      onChange={(e) => updateField('loan_id', e.target.value || undefined)}
                    >
                      <option value="" disabled>
                        Select loan
                      </option>
                      {facilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Period Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Month 1, Q1 2025"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.period_name}
                    onChange={(e) => updateField('period_name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Draw Number
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.draw_number || ''}
                    onChange={(e) => updateField('draw_number', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Draw Amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.draw_amount}
                    onChange={(e) => updateField('draw_amount', Number(e.target.value))}
                  />
                  {formData.draw_amount > 0 && (
                    <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.draw_amount)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Draw Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.draw_date}
                    onChange={(e) => updateField('draw_date', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Purpose <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Site Work, Foundation, Framing"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.draw_purpose}
                    onChange={(e) => updateField('draw_purpose', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* STANDARD FIELDS */}
            {mode !== 'basic' && (
              <>
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Balance & Interest
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Outstanding Balance
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.outstanding_balance || ''}
                        onChange={(e) => updateField('outstanding_balance', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.outstanding_balance && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.outstanding_balance)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.interest_rate_pct || ''}
                        onChange={(e) => updateField('interest_rate_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Interest Expense
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.interest_expense || ''}
                        onChange={(e) => updateField('interest_expense', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.interest_expense && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.interest_expense)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Interest Paid
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.interest_paid || ''}
                        onChange={(e) => updateField('interest_paid', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.interest_paid && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.interest_paid)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Deferred Interest
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.deferred_interest || ''}
                        onChange={(e) => updateField('deferred_interest', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Dates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Request Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.request_date || ''}
                        onChange={(e) => updateField('request_date', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Approval Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.approval_date || ''}
                        onChange={(e) => updateField('approval_date', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Funding Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.funding_date || ''}
                        onChange={(e) => updateField('funding_date', e.target.value)}
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
                    Fees & Charges
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Unused Fee Charge
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.unused_fee_charge || ''}
                        onChange={(e) => updateField('unused_fee_charge', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.unused_fee_charge && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.unused_fee_charge)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Commitment Fee Charge
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.commitment_fee_charge || ''}
                        onChange={(e) => updateField('commitment_fee_charge', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.commitment_fee_charge && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.commitment_fee_charge)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Other Fees
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.other_fees || ''}
                        onChange={(e) => updateField('other_fees', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.other_fees && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.other_fees)}</div>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Approvals
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded border border-gray-600">
                      <label htmlFor="inspector_approval" className="text-sm font-medium text-gray-300">
                        Inspector Approval
                      </label>
                      <input
                        type="checkbox"
                        id="inspector_approval"
                        className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        checked={formData.inspector_approval || false}
                        onChange={(e) => updateField('inspector_approval', e.target.checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded border border-gray-600">
                      <label htmlFor="lender_approval" className="text-sm font-medium text-gray-300">
                        Lender Approval
                      </label>
                      <input
                        type="checkbox"
                        id="lender_approval"
                        className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        checked={formData.lender_approval || false}
                        onChange={(e) => updateField('lender_approval', e.target.checked)}
                      />
                    </div>
                  </div>
                </section>

                {/* Summary Card */}
                <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded">
                  <h4 className="text-sm font-semibold text-blue-300 mb-3">Draw Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400">Draw Amount:</div>
                      <div className="text-white font-medium">{formatCurrency(formData.draw_amount)}</div>
                    </div>
                    {formData.interest_expense && (
                      <div>
                        <div className="text-gray-400">Interest Expense:</div>
                        <div className="text-white font-medium">{formatCurrency(formData.interest_expense)}</div>
                      </div>
                    )}
                    {(formData.unused_fee_charge || formData.commitment_fee_charge || formData.other_fees) && (
                      <div>
                        <div className="text-gray-400">Total Fees:</div>
                        <div className="text-white font-medium">
                          {formatCurrency(
                            (formData.unused_fee_charge || 0) +
                            (formData.commitment_fee_charge || 0) +
                            (formData.other_fees || 0)
                          )}
                        </div>
                      </div>
                    )}
                    {formData.outstanding_balance && (
                      <div>
                        <div className="text-gray-400">Outstanding Balance:</div>
                        <div className="text-white font-medium">{formatCurrency(formData.outstanding_balance)}</div>
                      </div>
                    )}
                  </div>
                </div>
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
              {isSaving ? 'Saving...' : 'Save Draw'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
