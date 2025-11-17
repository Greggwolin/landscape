/**
 * Add Benchmark Modal
 * Simple form for creating new benchmarks
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { BenchmarkCategoryKey } from '@/types/benchmarks';

interface Props {
  category: BenchmarkCategoryKey;
  categoryLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBenchmarkModal({ category, categoryLabel, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    benchmark_name: '',
    value: '',
    uom_code: '$/SF',
    market_geography: '',
    confidence_level: 'medium' as 'high' | 'medium' | 'low',
    description: '',
    // Category-specific fields
    cost_phase: '',
    work_type: '',
    cost_type: '',
    value_type: 'flat_fee' as 'percentage' | 'flat_fee' | 'per_unit',
    percentage_of: '', // For percentage type
    unit_applies_to: '', // For per_unit type
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    console.log('[AddBenchmarkModal] Form submitted with data:', formData);

    try {
      // Validation for transaction costs
      if (category === 'transaction_cost' && !formData.cost_type) {
        console.log('[AddBenchmarkModal] Validation failed: cost_type required');
        setError('Please select a cost type');
        setSaving(false);
        return;
      }

      // Validation for "other" cost type requiring name
      if (category === 'transaction_cost' && formData.cost_type === 'other' && !formData.benchmark_name.trim()) {
        setError('Name is required for "Other" cost type');
        setSaving(false);
        return;
      }

      // Auto-generate benchmark name from cost type for transaction costs (except "other")
      let benchmarkName = formData.benchmark_name;
      if (category === 'transaction_cost' && formData.cost_type !== 'other') {
        // Convert cost_type to display name
        const costTypeMap: Record<string, string> = {
          'closing_costs': 'Closing Costs',
          'title_insurance': 'Title Insurance',
          'legal': 'Legal',
          'due_diligence': 'Due Diligence',
          'broker_fee': 'Broker Fee',
        };
        benchmarkName = costTypeMap[formData.cost_type] || formData.cost_type;
      }

      // Build request body based on category
      const body: any = {
        category,
        benchmark_name: benchmarkName,
        description: formData.description || undefined,
        market_geography: formData.market_geography || undefined,
        confidence_level: formData.confidence_level,
        source_type: 'user_input',
      };

      // Add category-specific fields
      if (category === 'unit_cost') {
        body.value = parseFloat(formData.value);
        body.uom_code = formData.uom_code;
        body.cost_phase = formData.cost_phase || undefined;
        body.work_type = formData.work_type || undefined;
      } else if (category === 'transaction_cost') {
        body.value = parseFloat(formData.value);
        body.value_type = formData.value_type;
        body.cost_type = formData.cost_type;
      }

      console.log('[AddBenchmarkModal] Sending to API:', body);

      const response = await fetch('/api/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log('[AddBenchmarkModal] Response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('[AddBenchmarkModal] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create benchmark');
      }

      console.log('[AddBenchmarkModal] Success! Calling onSuccess and onClose');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create benchmark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-card rounded-lg w-[600px] max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line-strong flex items-center justify-between">
          <h2 className="text-xl font-bold">Add New {categoryLabel}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 rounded border border-chip-error/60 bg-chip-error/10 p-3 text-sm text-chip-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Transaction Cost - Cost Type, Value, Unit on one line */}
            {category === 'transaction_cost' && (
              <div className="flex gap-4 items-end">
                {/* Cost Type */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">
                    Cost Type <span className="text-chip-error">*</span>
                  </label>
                  <select
                    value={formData.cost_type}
                    onChange={(e) => setFormData({ ...formData, cost_type: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  >
                    <option value="">-- Select Cost Type --</option>
                    <option value="closing_costs">Closing Costs</option>
                    <option value="title_insurance">Title Insurance</option>
                    <option value="legal">Legal</option>
                    <option value="due_diligence">Due Diligence</option>
                    <option value="broker_fee">Broker Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Value */}
                <div className="w-32">
                  <label className="block text-sm font-medium mb-1 text-center">
                    Value <span className="text-chip-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none text-right"
                    placeholder="2.50"
                  />
                </div>

                {/* Unit */}
                <div className="w-32">
                  <label className="block text-sm font-medium mb-1 text-center">
                    Unit <span className="text-chip-error">*</span>
                  </label>
                  <select
                    value={formData.value_type}
                    onChange={(e) => setFormData({ ...formData, value_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  >
                    <option value="flat_fee">$$</option>
                    <option value="percentage">% of</option>
                    <option value="per_unit">$/Unit</option>
                  </select>
                </div>
              </div>
            )}

            {/* Name - Only for "other" cost type or non-transaction costs */}
            {(category === 'transaction_cost' && formData.cost_type === 'other') && (
              <div className="w-[40%]">
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-chip-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.benchmark_name}
                  onChange={(e) => setFormData({ ...formData, benchmark_name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  placeholder="e.g., Custom transaction cost"
                />
              </div>
            )}

            {/* Name - For non-transaction cost categories */}
            {category !== 'transaction_cost' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-chip-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.benchmark_name}
                  onChange={(e) => setFormData({ ...formData, benchmark_name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  placeholder="e.g., Grading - Standard"
                />
              </div>
            )}

            {/* Value and Unit - For unit_cost only */}
            {category === 'unit_cost' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Value <span className="text-chip-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                    placeholder="2.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Unit <span className="text-chip-error">*</span>
                  </label>
                  <select
                    value={formData.uom_code}
                    onChange={(e) => setFormData({ ...formData, uom_code: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  >
                    <option value="$/SF">$/SF</option>
                    <option value="$/FF">$/FF</option>
                    <option value="$/CY">$/CY</option>
                    <option value="$/LOT">$/LOT</option>
                    <option value="$/ACRE">$/ACRE</option>
                    <option value="$/UNIT">$/UNIT</option>
                  </select>
                </div>
              </div>
            )}

            {/* Conditional fields for % of and $/Unit */}
            {category === 'transaction_cost' && formData.value_type === 'percentage' && (
              <div className="w-[40%] ml-0 pl-4 border-l-2 border-blue-500">
                <label className="block text-sm font-medium mb-1 text-text-secondary">
                  % of (what item)
                </label>
                <div className="px-3 py-2 bg-surface-card border border-line-strong rounded text-text-secondary text-sm italic">
                  To Come
                </div>
              </div>
            )}

            {category === 'transaction_cost' && formData.value_type === 'per_unit' && (
              <div className="w-[40%] ml-0 pl-4 border-l-2 border-blue-500">
                <label className="block text-sm font-medium mb-1 text-text-secondary">
                  $/Unit applies to
                </label>
                <div className="px-3 py-2 bg-surface-card border border-line-strong rounded text-text-secondary text-sm italic">
                  To Come
                </div>
              </div>
            )}

            {/* Unit Cost specific fields */}
            {category === 'unit_cost' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Phase</label>
                  <select
                    value={formData.cost_phase}
                    onChange={(e) => setFormData({ ...formData, cost_phase: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                  >
                    <option value="">-- Select --</option>
                    <option value="planning">Planning</option>
                    <option value="site_work">Site Work</option>
                    <option value="utilities">Utilities</option>
                    <option value="paving">Paving</option>
                    <option value="landscaping">Landscaping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Work Type</label>
                  <input
                    type="text"
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                    placeholder="e.g., grading, excavation"
                  />
                </div>
              </div>
            )}

            {/* Confidence Level - Only for non-transaction costs (no geography in global benchmarks) */}
            {category !== 'transaction_cost' && (
              <div>
                <label className="block text-sm font-medium mb-1">Confidence Level</label>
                <select
                  value={formData.confidence_level}
                  onChange={(e) => setFormData({ ...formData, confidence_level: e.target.value as any })}
                  className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-surface-card border border-line-strong rounded focus:border-brand-primary focus:outline-none"
                rows={3}
                placeholder="Optional notes or context"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line-strong flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-surface-card hover:bg-surface-card rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-surface-card disabled:cursor-not-allowed rounded transition-colors"
          >
            {saving ? 'Creating...' : 'Create Benchmark'}
          </button>
        </div>
      </div>
    </div>
  );
}
