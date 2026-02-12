'use client';

import React from 'react';

interface EquityTranche {
  tranche_id?: number;
  tranche_name: string;
  partner_type: string;
  ownership_pct: number;
  capital_contributed: number;
  unreturned_capital?: number;
  cumulative_distributions?: number;
  preferred_return_pct: number;
  accrued_preferred_return?: number;
  preferred_return_paid_to_date?: number;
  promote_pct?: number;
  catch_up_pct?: number;
  promote_trigger_type?: string;
  promote_tier_1_threshold?: number;
  promote_tier_3_threshold?: number;
  promote_tier_3_pct?: number;
  irr_target_pct?: number;
  equity_multiple_target?: number;
  cash_on_cash_target_pct?: number;
  distribution_frequency?: string;
  distribution_priority?: number;
  can_defer_distributions?: boolean;
  management_fee_pct?: number;
  management_fee_base?: string;
  acquisition_fee_pct?: number;
  disposition_fee_pct?: number;
  promote_fee_pct?: number;
  has_clawback?: boolean;
  clawback_threshold_pct?: number;
  has_lookback?: boolean;
  lookback_at_sale?: boolean;
}

interface EquityPartnerFormProps {
  partner: EquityTranche | null;
  mode: 'basic' | 'standard' | 'advanced';
  onSave: (partner: EquityTranche) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function EquityPartnerForm({ partner, mode, onSave, onCancel, isSaving }: EquityPartnerFormProps) {
  const [formData, setFormData] = React.useState<EquityTranche>(partner || {
    tranche_name: '',
    partner_type: 'LP',
    ownership_pct: 0,
    capital_contributed: 0,
    preferred_return_pct: 0,
  });

  const updateField = (field: keyof EquityTranche, value: any) => {
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
            {partner ? 'Edit Equity Partner' : 'Add Equity Partner'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Partner Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.tranche_name}
                    onChange={(e) => updateField('tranche_name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Partner Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.partner_type}
                    onChange={(e) => updateField('partner_type', e.target.value)}
                  >
                    <option value="LP">LP (Limited Partner)</option>
                    <option value="GP">GP (General Partner)</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="JV">JV Partner</option>
                    <option value="Mezzanine">Mezzanine</option>
                    <option value="Preferred">Preferred Equity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ownership (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.ownership_pct}
                    onChange={(e) => updateField('ownership_pct', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Capital Contributed <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.capital_contributed}
                    onChange={(e) => updateField('capital_contributed', Number(e.target.value))}
                  />
                  {formData.capital_contributed > 0 && (
                    <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.capital_contributed)}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preferred Return (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.preferred_return_pct}
                    onChange={(e) => updateField('preferred_return_pct', Number(e.target.value))}
                  />
                </div>
              </div>
            </section>

            {/* STANDARD FIELDS */}
            {mode !== 'basic' && (
              <>
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Capital Tracking
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Unreturned Capital
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.unreturned_capital || ''}
                        onChange={(e) => updateField('unreturned_capital', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.unreturned_capital && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.unreturned_capital)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cumulative Distributions
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.cumulative_distributions || ''}
                        onChange={(e) => updateField('cumulative_distributions', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      {formData.cumulative_distributions && (
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(formData.cumulative_distributions)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Accrued Preferred Return
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.accrued_preferred_return || ''}
                        onChange={(e) => updateField('accrued_preferred_return', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Preferred Return Paid to Date
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.preferred_return_paid_to_date || ''}
                        onChange={(e) => updateField('preferred_return_paid_to_date', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Promote Structure
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Promote (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.promote_pct || ''}
                        onChange={(e) => updateField('promote_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Catch-Up (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.catch_up_pct || ''}
                        onChange={(e) => updateField('catch_up_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Promote Trigger Type
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.promote_trigger_type || 'irr'}
                        onChange={(e) => updateField('promote_trigger_type', e.target.value)}
                      >
                        <option value="irr">IRR</option>
                        <option value="equity_multiple">Equity Multiple</option>
                        <option value="cash_on_cash">Cash on Cash</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Return Targets
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        IRR Target (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.irr_target_pct || ''}
                        onChange={(e) => updateField('irr_target_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Equity Multiple Target
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.equity_multiple_target || ''}
                        onChange={(e) => updateField('equity_multiple_target', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cash on Cash Target (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.cash_on_cash_target_pct || ''}
                        onChange={(e) => updateField('cash_on_cash_target_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Distribution Terms
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Distribution Frequency
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.distribution_frequency || 'Quarterly'}
                        onChange={(e) => updateField('distribution_frequency', e.target.value)}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Semi-Annual">Semi-Annual</option>
                        <option value="Annual">Annual</option>
                        <option value="At Sale">At Sale Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Distribution Priority
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1 = first priority"
                        value={formData.distribution_priority || ''}
                        onChange={(e) => updateField('distribution_priority', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="can_defer_distributions"
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        checked={formData.can_defer_distributions || false}
                        onChange={(e) => updateField('can_defer_distributions', e.target.checked)}
                      />
                      <label htmlFor="can_defer_distributions" className="ml-2 text-sm font-medium text-gray-300">
                        Can Defer Distributions
                      </label>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Fees
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Management Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.management_fee_pct || ''}
                        onChange={(e) => updateField('management_fee_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Management Fee Base
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.management_fee_base || 'equity'}
                        onChange={(e) => updateField('management_fee_base', e.target.value)}
                      >
                        <option value="equity">Equity</option>
                        <option value="total_cap">Total Capitalization</option>
                        <option value="gmi">Gross Monthly Income</option>
                        <option value="total_cost">Total Project Cost</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Acquisition Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.acquisition_fee_pct || ''}
                        onChange={(e) => updateField('acquisition_fee_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Disposition Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.disposition_fee_pct || ''}
                        onChange={(e) => updateField('disposition_fee_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Promote Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.promote_fee_pct || ''}
                        onChange={(e) => updateField('promote_fee_pct', e.target.value ? Number(e.target.value) : undefined)}
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
                    Promote Tiers (Advanced)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tier 1 Threshold (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.promote_tier_1_threshold || ''}
                        onChange={(e) => updateField('promote_tier_1_threshold', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tier 3 Threshold (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.promote_tier_3_threshold || ''}
                        onChange={(e) => updateField('promote_tier_3_threshold', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tier 3 Promote (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.promote_tier_3_pct || ''}
                        onChange={(e) => updateField('promote_tier_3_pct', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                    Clawback & Lookback Provisions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="has_clawback"
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        checked={formData.has_clawback || false}
                        onChange={(e) => updateField('has_clawback', e.target.checked)}
                      />
                      <label htmlFor="has_clawback" className="ml-2 text-sm font-medium text-gray-300">
                        Has Clawback Provision
                      </label>
                    </div>

                    {formData.has_clawback && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Clawback Threshold (%)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formData.clawback_threshold_pct || ''}
                          onChange={(e) => updateField('clawback_threshold_pct', e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="has_lookback"
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        checked={formData.has_lookback || false}
                        onChange={(e) => updateField('has_lookback', e.target.checked)}
                      />
                      <label htmlFor="has_lookback" className="ml-2 text-sm font-medium text-gray-300">
                        Has Lookback Provision
                      </label>
                    </div>

                    {formData.has_lookback && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="lookback_at_sale"
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                          checked={formData.lookback_at_sale || false}
                          onChange={(e) => updateField('lookback_at_sale', e.target.checked)}
                        />
                        <label htmlFor="lookback_at_sale" className="ml-2 text-sm font-medium text-gray-300">
                          Lookback at Sale
                        </label>
                      </div>
                    )}
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
              {isSaving ? 'Saving...' : 'Save Partner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
