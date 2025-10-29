'use client';

import React from 'react';

interface WaterfallTier {
  tier_id?: number;
  tier_number: number;
  tier_name: string;
  irr_threshold_pct?: number | null;
  equity_multiple_threshold?: number | null;
  lp_split_pct: number;
  gp_split_pct: number;
  is_pari_passu?: boolean;
  is_lookback_tier?: boolean;
  catch_up_to_pct?: number;
  is_active: boolean;
  display_order?: number;
}

interface WaterfallTierFormProps {
  tier: WaterfallTier | null;
  mode: 'basic' | 'standard' | 'advanced';
  onSave: (tier: WaterfallTier) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function WaterfallTierForm({ tier, mode, onSave, onCancel, isSaving }: WaterfallTierFormProps) {
  const [formData, setFormData] = React.useState<WaterfallTier>(tier || {
    tier_number: 1,
    tier_name: '',
    lp_split_pct: 100,
    gp_split_pct: 0,
    is_active: true,
  });

  const updateField = (field: keyof WaterfallTier, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate complementary split
      if (field === 'lp_split_pct') {
        updated.gp_split_pct = 100 - Number(value);
      } else if (field === 'gp_split_pct') {
        updated.lp_split_pct = 100 - Number(value);
      }

      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate splits sum to 100%
    const totalSplit = formData.lp_split_pct + formData.gp_split_pct;
    if (Math.abs(totalSplit - 100) > 0.01) {
      alert('LP and GP splits must sum to 100%');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-semibold text-white">
            {tier ? 'Edit Waterfall Tier' : 'Add Waterfall Tier'}
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
                    Tier Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.tier_number}
                    onChange={(e) => updateField('tier_number', Number(e.target.value))}
                  />
                  <div className="text-xs text-gray-400 mt-1">Order in waterfall sequence</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tier Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Preferred Return, GP Catch-Up, Split"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.tier_name}
                    onChange={(e) => updateField('tier_name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    LP Split (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.lp_split_pct}
                    onChange={(e) => updateField('lp_split_pct', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GP Split (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.gp_split_pct}
                    onChange={(e) => updateField('gp_split_pct', Number(e.target.value))}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded border border-gray-600">
                    <span className="text-sm text-gray-300">Total Split:</span>
                    <span className={`text-lg font-semibold ${
                      Math.abs(formData.lp_split_pct + formData.gp_split_pct - 100) < 0.01
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {(formData.lp_split_pct + formData.gp_split_pct).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    checked={formData.is_active}
                    onChange={(e) => updateField('is_active', e.target.checked)}
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-300">
                    Active Tier
                  </label>
                </div>
              </div>
            </section>

            {/* STANDARD FIELDS */}
            {mode !== 'basic' && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                  Return Thresholds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      IRR Threshold (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.irr_threshold_pct || ''}
                      onChange={(e) => updateField('irr_threshold_pct', e.target.value ? Number(e.target.value) : null)}
                    />
                    <div className="text-xs text-gray-400 mt-1">IRR hurdle to reach this tier</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Equity Multiple Threshold
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.equity_multiple_threshold || ''}
                      onChange={(e) => updateField('equity_multiple_threshold', e.target.value ? Number(e.target.value) : null)}
                    />
                    <div className="text-xs text-gray-400 mt-1">Alternative to IRR threshold</div>
                  </div>
                </div>
              </section>
            )}

            {/* ADVANCED FIELDS */}
            {mode === 'advanced' && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-gray-700">
                  Advanced Tier Characteristics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_pari_passu"
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      checked={formData.is_pari_passu || false}
                      onChange={(e) => updateField('is_pari_passu', e.target.checked)}
                    />
                    <label htmlFor="is_pari_passu" className="ml-2 text-sm font-medium text-gray-300">
                      Pari Passu Distribution
                    </label>
                  </div>
                  <div className="text-xs text-gray-400">
                    Partners share pro rata until threshold
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_lookback_tier"
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      checked={formData.is_lookback_tier || false}
                      onChange={(e) => updateField('is_lookback_tier', e.target.checked)}
                    />
                    <label htmlFor="is_lookback_tier" className="ml-2 text-sm font-medium text-gray-300">
                      Lookback Tier
                    </label>
                  </div>
                  <div className="text-xs text-gray-400">
                    True-up tier for promote lookback
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Catch-Up To (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.catch_up_to_pct || ''}
                      onChange={(e) => updateField('catch_up_to_pct', e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <div className="text-xs text-gray-400 mt-1">GP catch-up target percentage</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.display_order || ''}
                      onChange={(e) => updateField('display_order', e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <div className="text-xs text-gray-400 mt-1">Override tier_number for display</div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded">
                  <h4 className="text-sm font-semibold text-blue-300 mb-2">Waterfall Example</h4>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>Tier 1: Return of Capital (100% LP / 0% GP)</div>
                    <div>Tier 2: Preferred Return @ 8% IRR (100% LP / 0% GP)</div>
                    <div>Tier 3: GP Catch-Up to 20% (0% LP / 100% GP)</div>
                    <div>Tier 4: Split @ 8-12% IRR (80% LP / 20% GP)</div>
                    <div>Tier 5: Split @ 12%+ IRR (70% LP / 30% GP)</div>
                  </div>
                </div>
              </section>
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
              {isSaving ? 'Saving...' : 'Save Tier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
