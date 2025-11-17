/**
 * Benchmark Accordion Component
 * Collapsible category sections showing benchmark lists
 */

import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { BenchmarkCategory, Benchmark } from '@/types/benchmarks';

interface Props {
  category: BenchmarkCategory;
  benchmarks: Benchmark[];
  isExpanded: boolean;
  onToggle: () => void;
  onBenchmarkClick: (benchmark: Benchmark) => void;
  onAddNew: () => void;
  onRefresh?: () => void;
}

// Helper: Format value input to limit decimals
function formatValueInput(value: string, valueType: string = 'flat_fee'): string {
  if (!value) return '';

  // Remove non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');

  // For flat fees and most cases: no decimals
  if (valueType === 'flat_fee') {
    return cleaned.split('.')[0];
  }

  // For percentages: allow up to 2 decimals
  if (valueType === 'percentage') {
    const parts = cleaned.split('.');
    if (parts.length > 1) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  }

  // For per_unit: allow decimals only if value < 10, otherwise no decimals
  if (valueType === 'per_unit') {
    const numValue = parseFloat(cleaned);
    if (numValue < 10) {
      const parts = cleaned.split('.');
      if (parts.length > 1) {
        return parts[0] + '.' + parts[1].substring(0, 2);
      }
      return cleaned;
    } else {
      return cleaned.split('.')[0];
    }
  }

  return cleaned;
}

export default function BenchmarkAccordion({
  category,
  benchmarks,
  isExpanded,
  onToggle,
  onBenchmarkClick,
  onAddNew,
  onRefresh
}: Props) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newFormData, setNewFormData] = React.useState({
    benchmark_name: '',
    value: '',
    percentage: '',
    cost_type: '',
    value_type: 'flat_fee' as 'percentage' | 'flat_fee' | 'per_unit',
    basis: '', // For "% of what" field
    uom_code: '$/SF',
    description: '',
    cost_phase: '',
    work_type: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Calculate stale count (>730 days = 24 months)
  const staleCount = benchmarks.filter(b => (b.age_days || 0) > 730).length;

  // Sort benchmarks: built-in first, then user-defined
  const sortedBenchmarks = React.useMemo(() => {
    if (category.key !== 'transaction_cost') return benchmarks;

    const builtInTypes = ['closing_costs', 'title_insurance', 'legal', 'due_diligence', 'broker_fee'];
    return [...benchmarks].sort((a, b) => {
      const aIsBuiltIn = builtInTypes.includes((a as any).cost_type);
      const bIsBuiltIn = builtInTypes.includes((b as any).cost_type);

      if (aIsBuiltIn && !bIsBuiltIn) return -1;
      if (!aIsBuiltIn && bIsBuiltIn) return 1;
      return 0;
    });
  }, [benchmarks, category.key]);

  const handleAddNew = async () => {
    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!newFormData.benchmark_name.trim()) {
      setError('Name is required');
      return;
    }

    if (category.key === 'transaction_cost' || category.key === 'unit_cost') {
      if (!newFormData.value || newFormData.value.trim() === '') {
        setError('Amount is required');
        return;
      }

      const numValue = parseFloat(newFormData.value);
      if (isNaN(numValue) || numValue <= 0) {
        setError('Please enter a valid amount greater than 0');
        return;
      }
    }

    if (category.key === 'contingency') {
      if (!newFormData.percentage || newFormData.percentage.trim() === '') {
        setError('Percentage is required');
        return;
      }

      const numValue = parseFloat(newFormData.percentage);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        setError('Please enter a valid percentage between 0 and 100');
        return;
      }
    }

    setSaving(true);
    try {
      const body: any = {
        category: category.key,
        benchmark_name: newFormData.benchmark_name,
        description: newFormData.description || undefined,
        source_type: 'user_input',
        confidence_level: 'medium',
      };

      if (category.key === 'transaction_cost') {
        body.value = parseFloat(newFormData.value);
        body.value_type = newFormData.value_type;
        body.cost_type = 'other'; // All custom transaction costs are "other"
        if (newFormData.basis) {
          body.basis = newFormData.basis;
        }
      } else if (category.key === 'unit_cost') {
        body.value = parseFloat(newFormData.value);
        body.uom_code = newFormData.uom_code;
        body.cost_phase = newFormData.cost_phase || undefined;
        body.work_type = newFormData.work_type || undefined;
      } else if (category.key === 'contingency') {
        body.percentage = parseFloat(newFormData.percentage);
      }

      console.log('[BenchmarkAccordion] Submitting benchmark:', body);

      const response = await fetch('/api/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log('[BenchmarkAccordion] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('[BenchmarkAccordion] Full error details:', errorData);
        throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
      }

      // Success!
      setSuccessMessage('Benchmark created successfully');
      setNewFormData({
        benchmark_name: '',
        value: '',
        percentage: '',
        cost_type: '',
        value_type: 'flat_fee',
        basis: '',
        uom_code: '$/SF',
        description: '',
        cost_phase: '',
        work_type: '',
      });

      // Auto-hide success message and close form after 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setShowAddForm(false);
        onRefresh?.();
      }, 2000);

    } catch (error) {
      console.error('Failed to create:', error);
      setError(error instanceof Error ? error.message : 'Failed to create benchmark. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setError(null);
    setSuccessMessage(null);
    setNewFormData({
      benchmark_name: '',
      value: '',
      percentage: '',
      cost_type: '',
      value_type: 'flat_fee',
      basis: '',
      uom_code: '$/SF',
      description: '',
      cost_phase: '',
      work_type: '',
    });
  };

  return (
    <div className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={20} className="" style={{ color: 'var(--cui-secondary-color)' }} />
          ) : (
            <ChevronRight size={20} className="" style={{ color: 'var(--cui-secondary-color)' }} />
          )}
          <span className="font-medium">{category.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {staleCount > 0 && (
            <span className="text-xs text-chip-error font-semibold">
              {staleCount} stale
            </span>
          )}
          <span className="text-sm " style={{ color: 'var(--cui-secondary-color)' }}>{category.count}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-slate-850 px-4 py-2">
          {benchmarks.length === 0 && !showAddForm ? (
            <div className="text-sm  py-4 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
              No benchmarks yet. Click "Add New" to create.
            </div>
          ) : (
            <div className="space-y-1">
              {/* Column Headers */}
              <div className="flex items-center w-full px-3 py-1 text-xs font-medium  uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
                <span className="w-48">Item</span>
                <span className="w-32 text-right">Amount</span>
                <span className="w-32 ml-4 text-right">Type</span>
              </div>
              {sortedBenchmarks.map(benchmark => (
                <BenchmarkListItem
                  key={benchmark.benchmark_id}
                  benchmark={benchmark}
                  onClick={() => onBenchmarkClick(benchmark)}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}

          {/* Add New Form - Inline */}
          {showAddForm ? (
            <div className="mt-2 w-full px-3 py-3 rounded  border border-blue-500" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
              {/* Error Message */}
              {error && (
                <div className="mb-3 rounded border border-chip-error/60 bg-chip-error/10 px-3 py-2 text-sm text-chip-error">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="mb-3 rounded border border-chip-success/60 bg-chip-success/10 px-3 py-2 text-sm text-chip-success">
                  {successMessage}
                </div>
              )}

              {category.key === 'transaction_cost' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Name</label>
                      <input
                        type="text"
                        value={newFormData.benchmark_name || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, benchmark_name: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Amount</label>
                      <input
                        type="text"
                        value={newFormData.value || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, value: formatValueInput(e.target.value, newFormData.value_type) })}
                        onFocus={(e) => e.target.select()}
                        className="w-24 px-2 py-1 border rounded text-sm text-right"
                        style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Type</label>
                      <select
                        value={newFormData.value_type}
                        onChange={(e) => setNewFormData({ ...newFormData, value_type: e.target.value as any })}
                        className="w-24 px-2 py-1 border rounded text-sm"
                        style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      >
                        <option value="flat_fee">$$</option>
                        <option value="percentage">% of</option>
                        <option value="per_unit">$/Unit</option>
                      </select>
                    </div>
                  </div>

                  {/* Show "% of what" field when percentage is selected */}
                  {newFormData.value_type === 'percentage' && (
                    <div className="space-y-1">
                      <label className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Select Factor to Apply Percentage</label>
                      <select
                        className="w-full px-2 py-1 border rounded text-sm"
                        style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}
                        disabled
                      >
                        <option>Coming Soon</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Description</label>
                    <textarea
                      value={newFormData.description || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      placeholder="-"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name || !newFormData.value}
                      className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : category.key === 'contingency' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Name</label>
                      <input
                        type="text"
                        value={newFormData.benchmark_name || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, benchmark_name: e.target.value })}
                        className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="e.g., Soft Costs"
                      />
                    </div>
                    <div>
                      <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Percentage (%)</label>
                      <input
                        type="text"
                        value={newFormData.percentage || ''}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^\d.]/g, '');
                          setNewFormData({ ...newFormData, percentage: cleaned });
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-24 px-2 py-1 border  rounded text-sm text-right" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="5.0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Description</label>
                    <textarea
                      value={newFormData.description || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                      className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      placeholder="-"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name || !newFormData.percentage}
                      className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : category.key === 'unit_cost' ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Name</label>
                    <input
                      type="text"
                      value={newFormData.benchmark_name || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, benchmark_name: e.target.value })}
                      className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      placeholder="-"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div>
                      <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Amount</label>
                      <input
                        type="text"
                        value={newFormData.value || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, value: formatValueInput(e.target.value, 'per_unit') })}
                        onFocus={(e) => e.target.select()}
                        className="w-32 px-2 py-1 border  rounded text-sm text-right" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Unit</label>
                      <select
                        value={newFormData.uom_code}
                        onChange={(e) => setNewFormData({ ...newFormData, uom_code: e.target.value })}
                        className="w-32 px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
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
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Cost Phase</label>
                      <input
                        type="text"
                        value={newFormData.cost_phase || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, cost_phase: e.target.value })}
                        className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="-"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Work Type</label>
                      <input
                        type="text"
                        value={newFormData.work_type || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, work_type: e.target.value })}
                        className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                        placeholder="-"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Description</label>
                    <textarea
                      value={newFormData.description || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                      className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      placeholder="-"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name || !newFormData.value}
                      className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFormData.benchmark_name || ''}
                    onChange={(e) => setNewFormData({ ...newFormData, benchmark_name: e.target.value })}
                    className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                    placeholder="-"
                  />
                  <textarea
                    value={newFormData.description || ''}
                    onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                    className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                    placeholder="-"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name}
                      className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                    >
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 w-full px-3 py-2 border  rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--cui-border-color)' }}
            >
              + Add New {category.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Benchmark List Item Sub-component - Inline Editable Tile
function BenchmarkListItem({
  benchmark,
  onClick,
  onRefresh
}: {
  benchmark: Benchmark;
  onClick: () => void;
  onRefresh?: () => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);

  // Helper function to get initial form data from benchmark
  const getInitialFormData = React.useCallback(() => ({
    benchmark_name: benchmark.benchmark_name || '',
    value: benchmark.value?.toString() || '0',
    cost_type: (benchmark as any).cost_type || '',
    value_type: (benchmark as any).value_type || 'flat_fee',
    basis: (benchmark as any).basis || '', // For "% of what" field
    uom_code: benchmark.uom_code || '$/SF',
    description: benchmark.description || '',
    cost_phase: (benchmark as any).cost_phase || '',
    work_type: (benchmark as any).work_type || '',
  }), [benchmark]);

  const [formData, setFormData] = React.useState(getInitialFormData);
  const [saving, setSaving] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Reset form data when benchmark changes or when entering edit mode
  React.useEffect(() => {
    if (isEditing) {
      setFormData(getInitialFormData());
    }
  }, [isEditing, getInitialFormData]);

  const ageDays = benchmark.age_days || 0;
  const ageMonths = Math.floor(ageDays / 30);
  const ageColor = ageDays < 365
    ? 'text-chip-success'
    : ageDays < 730
    ? 'text-text-secondary'
    : 'text-chip-error';

  const handleSave = async () => {
    setSaving(true);
    try {
      // Transaction cost benchmarks from tbl_sale_benchmarks use a different endpoint
      const isTransactionCost = benchmark.category === 'transaction_cost';
      const isSaleBenchmark = benchmark.source_type === 'global_default'; // Sale benchmarks have this marker

      let endpoint: string;
      let payload: any;

      if (isTransactionCost && isSaleBenchmark) {
        // Use sale-benchmarks endpoint for global transaction costs
        // Remove the offset (1000000) to get the actual sale benchmark ID
        const actualBenchmarkId = benchmark.benchmark_id - 1000000;
        endpoint = `/api/sale-benchmarks/${actualBenchmarkId}`;

        const value = parseFloat(formData.value);

        // Determine which field to set based on value_type
        let saleBenchmarkPayload: any = {
          benchmark_name: formData.benchmark_name,
          description: formData.description,
        };

        if (formData.value_type === 'flat_fee') {
          saleBenchmarkPayload.fixed_amount = value;
          saleBenchmarkPayload.rate_pct = null;
          saleBenchmarkPayload.amount_per_uom = null;
        } else if (formData.value_type === 'percentage') {
          saleBenchmarkPayload.rate_pct = value / 100; // Convert 3 to 0.03
          saleBenchmarkPayload.fixed_amount = null;
          saleBenchmarkPayload.amount_per_uom = null;
        } else if (formData.value_type === 'per_unit') {
          saleBenchmarkPayload.amount_per_uom = value;
          saleBenchmarkPayload.uom_code = formData.uom_code;
          saleBenchmarkPayload.fixed_amount = null;
          saleBenchmarkPayload.rate_pct = null;
        }

        payload = saleBenchmarkPayload;
      } else {
        // Use old benchmarks endpoint for legacy transaction costs
        endpoint = `/api/benchmarks/${benchmark.benchmark_id}`;
        payload = {
          benchmark_name: formData.benchmark_name,
          value: parseFloat(formData.value),
          cost_type: formData.cost_type,
          value_type: formData.value_type,
          basis: formData.basis || undefined,
          uom_code: formData.uom_code,
          description: formData.description,
          cost_phase: formData.cost_phase,
          work_type: formData.work_type,
        };
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsEditing(false);
        // Refresh parent
        onRefresh?.();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save:', errorData);
        alert(`Failed to save: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(getInitialFormData());
    setShowDeleteConfirm(false);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/benchmarks/${benchmark.benchmark_id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh to show updated list
        onRefresh?.();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }));
        alert(errorData.error || 'Failed to delete benchmark');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete benchmark');
    } finally {
      setDeleting(false);
    }
  };

  // Check if this is a built-in (standard cost type)
  const isBuiltIn = benchmark.category === 'transaction_cost' &&
    ['closing_costs', 'title_insurance', 'legal', 'due_diligence', 'broker_fee'].includes((benchmark as any).cost_type);

  // Edit mode - Inline form
  if (isEditing) {
    return (
      <div className="w-full px-3 py-3 rounded border " style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}>
        {benchmark.category === 'transaction_cost' ? (
          // Transaction Cost Edit Form
          <div className="space-y-2">
            {/* Row 1: Name (read-only for built-ins), Value, Type */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Name</label>
                <input
                  type="text"
                  value={formData.benchmark_name || ''}
                  onChange={(e) => !isBuiltIn && setFormData({ ...formData, benchmark_name: e.target.value })}
                  disabled={isBuiltIn}
                  className="w-full px-2 py-1 border  rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Amount</label>
                <input
                  type="text"
                  value={formData.value ? parseFloat(formData.value).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  }) : ''}
                  onChange={(e) => {
                    const formatted = formatValueInput(e.target.value, formData.value_type);
                    setFormData({ ...formData, value: formatted });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-24 px-2 py-1 border  rounded text-sm text-right" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Type</label>
                <select
                  value={formData.value_type}
                  onChange={(e) => setFormData({ ...formData, value_type: e.target.value as any })}
                  className="w-24 px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                >
                  <option value="flat_fee">$$</option>
                  <option value="percentage">% of</option>
                  <option value="per_unit">$/Unit</option>
                </select>
              </div>
            </div>

            {/* Row 2: "% of what" field - Only show when percentage is selected */}
            {formData.value_type === 'percentage' && (
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Select Factor to Apply Percentage</label>
                <select
                  className="w-full px-2 py-1 border rounded text-sm"
                  style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}
                  disabled
                >
                  <option>Coming Soon</option>
                </select>
              </div>
            )}

            {/* Row 3: Description */}
            <div>
              <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                placeholder="-"
                rows={2}
              />
            </div>

            {/* Actions */}
            {showDeleteConfirm ? (
              <div className="rounded border border-chip-error/60 bg-chip-error/10 p-3">
                <p className="text-sm text-chip-error mb-2">
                  Delete this benchmark? This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800/80 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1 text-xs bg-chip-error hover:bg-chip-error/90 disabled:opacity-50 rounded text-white"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 justify-between">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1 text-xs text-chip-error hover:bg-chip-error/10 rounded"
                >
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : benchmark.category === 'unit_cost' ? (
          // Unit Cost Edit Form
          <div className="space-y-2">
            {/* Row 1: Name */}
            <div>
              <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Name</label>
              <input
                type="text"
                value={formData.benchmark_name || ''}
                onChange={(e) => setFormData({ ...formData, benchmark_name: e.target.value })}
                className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                placeholder="-"
              />
            </div>

            {/* Row 2: Value, Unit */}
            <div className="flex gap-2">
              <div>
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Amount</label>
                <input
                  type="text"
                  value={formData.value || ''}
                  onChange={(e) => {
                    const formatted = formatValueInput(e.target.value, 'per_unit');
                    setFormData({ ...formData, value: formatted });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-32 px-2 py-1 border  rounded text-sm text-right" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Unit</label>
                <select
                  value={formData.uom_code}
                  onChange={(e) => setFormData({ ...formData, uom_code: e.target.value })}
                  className="w-32 px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
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

            {/* Row 3: Cost Phase, Work Type */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Cost Phase</label>
                <input
                  type="text"
                  value={formData.cost_phase || ''}
                  onChange={(e) => setFormData({ ...formData, cost_phase: e.target.value })}
                  className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                  placeholder="-"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Work Type</label>
                <input
                  type="text"
                  value={formData.work_type || ''}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                  placeholder="-"
                />
              </div>
            </div>

            {/* Row 4: Description */}
            <div>
              <label className="text-xs  mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                placeholder="-"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          // Generic edit form for other categories
          <div className="space-y-2">
            <input
              type="text"
              value={formData.benchmark_name || ''}
              onChange={(e) => setFormData({ ...formData, benchmark_name: e.target.value })}
              className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
              placeholder="-"
            />
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2 py-1 border  rounded text-sm" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
              placeholder="-"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs bg-brand-primary hover:bg-brand-primary/90 disabled: rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // View mode - Display tile
  const formatAmount = () => {
    if (!benchmark.value) return '-';

    if (benchmark.category === 'transaction_cost') {
      const value = parseFloat(benchmark.value.toString());
      const valueType = (benchmark as any).value_type;

      if (valueType === 'percentage') {
        const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, '');
        return `${formatted}%`;
      } else if (valueType === 'flat_fee') {
        // Format with commas, show decimals if they exist
        const hasDecimals = value % 1 !== 0;
        const formatted = value.toLocaleString('en-US', {
          minimumFractionDigits: hasDecimals ? 2 : 0,
          maximumFractionDigits: 2
        });
        return `$${formatted}`;
      } else if (valueType === 'per_unit') {
        // Format with commas, show decimals if they exist
        const hasDecimals = value % 1 !== 0;
        const formatted = value.toLocaleString('en-US', {
          minimumFractionDigits: hasDecimals ? 2 : 0,
          maximumFractionDigits: 2
        });
        return `$${formatted}`;
      }
      return `${value}`;
    }

    return `${benchmark.value} ${benchmark.uom_code || ''}`;
  };

  const formatType = () => {
    if (benchmark.category === 'transaction_cost') {
      const valueType = (benchmark as any).value_type;

      if (valueType === 'flat_fee') {
        return '$$';
      } else if (valueType === 'percentage') {
        return '% of';
      } else if (valueType === 'per_unit') {
        return '$/Unit';
      }
    }
    return benchmark.uom_code || '-';
  };

  const amountDisplay = formatAmount();
  const typeDisplay = formatType();

  return (
    <button
      onClick={() => {
        onClick();
        setIsEditing(true);
      }}
      className="w-full px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center text-left transition-colors"
    >
      <div className="flex items-center w-full">
        <span className="text-sm font-medium w-48">
          {benchmark.benchmark_name}
          {!isBuiltIn && <span className="ml-2 text-xs text-blue-500 font-semibold">u</span>}
        </span>
        <span className="text-sm  w-32 text-right" style={{ color: 'var(--cui-secondary-color)' }}>{amountDisplay}</span>
        <span className="text-sm  w-32 ml-4 text-right" style={{ color: 'var(--cui-secondary-color)' }}>{typeDisplay}</span>
        {ageMonths > 0 && (
          <span className={`text-xs font-medium ${ageColor} ml-auto`}>
            {ageMonths}mo
          </span>
        )}
      </div>
    </button>
  );
}
