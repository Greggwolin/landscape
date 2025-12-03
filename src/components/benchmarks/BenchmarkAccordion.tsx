/**
 * Benchmark Accordion Component
 * Collapsible category sections showing benchmark lists with table-based layout
 */

import React from 'react';
import { ChevronRight, ChevronDown, Globe, User, Pencil, X } from 'lucide-react';
import type { BenchmarkCategory, Benchmark } from '@/types/benchmarks';

interface Props {
  category: BenchmarkCategory;
  benchmarks: Benchmark[] | Record<string, Benchmark[]>; // Accept both array and object
  isExpanded: boolean;
  hideHeader?: boolean;
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

  // Allow up to 2 decimals for all types (flat fees can have cents)
  const parts = cleaned.split('.');
  if (parts.length > 1) {
    return parts[0] + '.' + parts[1].substring(0, 2);
  }
  return cleaned;
}

export default function BenchmarkAccordion({
  category,
  benchmarks,
  isExpanded,
  hideHeader = false,
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

  // Ensure benchmarks is an array (handle cases where it might be passed as an object)
  const benchmarksArray = React.useMemo(() => {
    if (!benchmarks) return [];
    if (Array.isArray(benchmarks)) return benchmarks;
    // If it's an object (Record<string, Benchmark[]>), flatten all values
    if (typeof benchmarks === 'object') {
      return Object.values(benchmarks).flat();
    }
    return [];
  }, [benchmarks]);

  // Calculate stale count (>730 days = 24 months)
  const staleCount = benchmarksArray.filter(b => (b.age_days || 0) > 730).length;

  // Sort benchmarks: global defaults first, then project-specific, then product-specific
  const sortedBenchmarks = React.useMemo(() => {
    return [...benchmarksArray].sort((a, b) => {
      // Use scope_level if available, fall back to source_type check
      const aScope = a.scope_level || (a.source_type === 'global_default' ? 'global' : 'project');
      const bScope = b.scope_level || (b.source_type === 'global_default' ? 'global' : 'project');

      const scopeOrder: Record<string, number> = { 'global': 0, 'project': 1, 'product': 2 };
      const aOrder = scopeOrder[aScope] ?? 999;
      const bOrder = scopeOrder[bScope] ?? 999;

      if (aOrder !== bOrder) return aOrder - bOrder;

      // Within same scope level, sort alphabetically by name
      return (a.benchmark_name || '').localeCompare(b.benchmark_name || '');
    });
  }, [benchmarksArray]);

  const handleAddNew = async () => {
    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!newFormData.benchmark_name.trim()) {
      setError('Name is required');
      return;
    }

    if (category.key === 'transaction_cost' || category.key === 'commission' || category.key === 'unit_cost') {
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

      if (category.key === 'transaction_cost' || category.key === 'commission') {
        body.value = parseFloat(newFormData.value);
        body.value_type = newFormData.value_type;
        body.cost_type = category.key === 'commission' ? 'commission' : 'other'; // Commission or other
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

      // Commission benchmarks use sale-benchmarks API
      const apiEndpoint = category.key === 'commission' ? '/api/sale-benchmarks' : '/api/benchmarks';

      const response = await fetch(apiEndpoint, {
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
    <div className={hideHeader ? '' : 'border-b'} style={hideHeader ? {} : { borderColor: 'var(--cui-border-color)' }}>
      {/* Accordion Header */}
      {!hideHeader && (
        <button
          onClick={onToggle}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors"
          style={{ backgroundColor: 'var(--surface-card-header)', color: 'var(--cui-body-color)' }}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown size={20} className="" style={{ color: 'var(--cui-secondary-color)' }} />
            ) : (
              <ChevronRight size={20} className="" style={{ color: 'var(--cui-secondary-color)' }} />
            )}
            <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>{category?.label || 'Unknown Category'}</span>
          </div>
          <div className="flex items-center gap-2">
            {staleCount > 0 && (
              <span className="text-xs text-chip-error font-semibold">
                {staleCount} stale
              </span>
            )}
            <span className="text-sm " style={{ color: 'var(--cui-secondary-color)' }}>{category?.count || benchmarksArray.length}</span>
          </div>
        </button>
      )}

      {/* Expanded Content */}
      {(isExpanded || hideHeader) && (
        <div className="bg-slate-850 px-4 py-2">
          {benchmarks.length === 0 && !showAddForm ? (
            <div className="text-sm  py-4 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
              No benchmarks yet. Click "Add New" to create.
            </div>
          ) : (
            <div className="space-y-1">
              {/* Column Headers */}
              <div className="flex items-center w-full px-3 py-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)', backgroundColor: 'var(--surface-subheader)' }}>
                <span className="flex-1">Item</span>
                <span className="w-8 text-center ml-2"></span>
                <span className="w-20 text-right ml-2">Amount</span>
                <span className="w-40 text-right ml-3">Type</span>
                <span className="w-16 text-center ml-2">Actions</span>
              </div>
              {/* Benchmark Items */}
              {sortedBenchmarks.map(benchmark => (
                <BenchmarkListItem
                  key={benchmark.scope_level ? `sale-${benchmark.benchmark_id}` : `legacy-${benchmark.benchmark_id}`}
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

              {category.key === 'transaction_cost' || category.key === 'commission' ? (
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
                      <label className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                        {category.key === 'commission' ? 'Percentage of' : 'Select Factor to Apply Percentage'}
                      </label>
                      <select
                        value={newFormData.basis || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, basis: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      >
                        <option value="">Select...</option>
                        {category.key === 'commission' ? (
                          <>
                            <option value="gross_sale_price">Gross Sale Price</option>
                            <option value="net_sale_price">Net Sale Price</option>
                            <option value="lease_value">Lease Value</option>
                          </>
                        ) : (
                          <>
                            <option value="gross_sale_price">Gross Sale Price</option>
                            <option value="net_sale_price">Net Sale Price</option>
                            <option value="lease_value">Lease Value</option>
                            <option value="purchase_price">Purchase Price</option>
                            <option value="loan_amount">Loan Amount</option>
                          </>
                        )}
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
  const getInitialFormData = React.useCallback(() => {
    const bm = benchmark as any;

    // Determine value and value_type from sale benchmark fields
    let value = '0';
    let value_type = 'flat_fee';
    let basis = '';

    if (bm.rate_pct != null) {
      // Percentage type - convert 0.03 to 3
      value = (parseFloat(bm.rate_pct) * 100).toString();
      value_type = 'percentage';
      basis = bm.basis || '';
    } else if (bm.fixed_amount != null) {
      // Flat fee type
      value = bm.fixed_amount.toString();
      value_type = 'flat_fee';
    } else if (bm.amount_per_uom != null) {
      // Per unit type
      value = bm.amount_per_uom.toString();
      value_type = 'per_unit';
    } else if (bm.value != null) {
      // Legacy benchmark with value field
      value = bm.value.toString();
      value_type = bm.value_type || 'flat_fee';
      basis = bm.basis || '';
    }

    return {
      benchmark_name: benchmark.benchmark_name || '',
      value,
      cost_type: bm.cost_type || '',
      value_type,
      basis,
      uom_code: benchmark.uom_code || '$/SF',
      description: benchmark.description || '',
      cost_phase: bm.cost_phase || '',
      work_type: bm.work_type || '',
      scope_level: benchmark.scope_level || (benchmark.source_type === 'global_default' ? 'global' : 'project'),
    };
  }, [benchmark]);

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
    console.log('[BenchmarkAccordion] handleSave called with formData:', formData);
    console.log('[BenchmarkAccordion] benchmark.category:', benchmark.category);
    console.log('[BenchmarkAccordion] benchmark.source_type:', benchmark.source_type);
    console.log('[BenchmarkAccordion] benchmark.scope_level:', benchmark.scope_level);
    try {
      // Determine endpoint based on benchmark category
      // Commission and transaction_cost benchmarks use tbl_sale_benchmarks
      const isSaleBenchmark = benchmark.category === 'commission' ||
                             benchmark.category === 'transaction_cost' ||
                             benchmark.source_type === 'global_default' ||
                             benchmark.scope_level;

      console.log('[BenchmarkAccordion] isSaleBenchmark:', isSaleBenchmark);

      let endpoint: string;
      let payload: any;

      if (isSaleBenchmark) {
        // Use sale-benchmarks endpoint (from tbl_sale_benchmarks)
        endpoint = `/api/sale-benchmarks/${benchmark.benchmark_id}`;

        const value = parseFloat(formData.value);

        // Determine which field to set based on value_type
        const saleBenchmarkPayload: any = {
          benchmark_name: formData.benchmark_name,
          description: formData.description,
          scope_level: formData.scope_level, // Include scope_level in update
        };
        console.log('[BenchmarkAccordion] Saving with scope_level:', formData.scope_level);

        if (formData.value_type === 'flat_fee') {
          saleBenchmarkPayload.fixed_amount = value;
          saleBenchmarkPayload.rate_pct = null;
          saleBenchmarkPayload.amount_per_uom = null;
          saleBenchmarkPayload.basis = null;
        } else if (formData.value_type === 'percentage') {
          saleBenchmarkPayload.rate_pct = value / 100; // Convert 3 to 0.03
          saleBenchmarkPayload.basis = formData.basis || null; // Include basis for percentage
          saleBenchmarkPayload.fixed_amount = null;
          saleBenchmarkPayload.amount_per_uom = null;
        } else if (formData.value_type === 'per_unit') {
          saleBenchmarkPayload.amount_per_uom = value;
          saleBenchmarkPayload.uom_code = formData.uom_code;
          saleBenchmarkPayload.fixed_amount = null;
          saleBenchmarkPayload.rate_pct = null;
          saleBenchmarkPayload.basis = null;
        }

        payload = saleBenchmarkPayload;
      } else {
        // Use old benchmarks endpoint for legacy benchmarks
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

      console.log('[BenchmarkAccordion] PATCH to endpoint:', endpoint);
      console.log('[BenchmarkAccordion] PATCH payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[BenchmarkAccordion] Response status:', response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json();
        console.log('[BenchmarkAccordion] Response data:', responseData);
        setIsEditing(false);
        // Only refresh parent for benchmarks that affect this panel
        // improvement_offset benchmarks don't need a full reload - the database trigger
        // will clear the cache and React Query will refetch when needed
        const isImprovementOffset = benchmark.category === 'improvement_offset' ||
                                   (isSaleBenchmark && benchmark.benchmark_type === 'improvement_offset');
        if (!isImprovementOffset) {
          console.log('[BenchmarkAccordion] Calling onRefresh to reload data');
          onRefresh?.();
        } else {
          console.log('[BenchmarkAccordion] Skipping onRefresh for improvement_offset - will auto-update via cache invalidation');
        }
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
      // Determine endpoint based on benchmark source
      const isSaleBenchmark = benchmark.source_type === 'global_default' || benchmark.scope_level;

      let endpoint: string;

      if (isSaleBenchmark) {
        // Use sale-benchmarks endpoint (from tbl_sale_benchmarks)
        endpoint = `/api/sale-benchmarks/${benchmark.benchmark_id}`;
      } else {
        // Use benchmarks endpoint for legacy benchmarks
        endpoint = `/api/benchmarks/${benchmark.benchmark_id}`;
      }

      const response = await fetch(endpoint, {
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

  // Edit mode - Inline form
  if (isEditing) {
    return (
      <div className="w-full px-3 py-3 rounded border" style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}>
            {benchmark.category === 'transaction_cost' || benchmark.category === 'commission' ? (
              // Transaction Cost Edit Form
              <div className="space-y-2">
                {/* Row 1: Name, Amount, Type, Factor - ALL ON ONE LINE */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Name</label>
                    <input
                      type="text"
                      value={formData.benchmark_name || ''}
                      onChange={(e) => setFormData({ ...formData, benchmark_name: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      placeholder="-"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Amount</label>
                    <input
                      type="text"
                      value={formData.value || ''}
                      onChange={(e) => {
                        const formatted = formatValueInput(e.target.value, formData.value_type);
                        setFormData({ ...formData, value: formatted });
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-2 py-1 border rounded text-sm text-right"
                      style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      placeholder="-"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Type</label>
                    <select
                      value={formData.value_type}
                      onChange={(e) => setFormData({ ...formData, value_type: e.target.value as any })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                    >
                      <option value="flat_fee">$$</option>
                      <option value="percentage">% of</option>
                      <option value="per_unit">$/Unit</option>
                    </select>
                  </div>
                  {/* Factor field - show inline when percentage is selected */}
                  {formData.value_type === 'percentage' && (
                    <div className="flex-1 min-w-0">
                      <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Factor</label>
                      <select
                        value={formData.basis || ''}
                        onChange={(e) => setFormData({ ...formData, basis: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                      >
                        <option value="">Select...</option>
                        {benchmark.category === 'commission' ? (
                          <>
                            <option value="gross_sale_price">Gross Sale Price</option>
                            <option value="net_sale_price">Net Sale Price</option>
                            <option value="lease_value">Lease Value</option>
                          </>
                        ) : (
                          <>
                            <option value="gross_sale_price">Gross Sale Price</option>
                            <option value="net_sale_price">Net Sale Price</option>
                            <option value="lease_value">Lease Value</option>
                            <option value="purchase_price">Purchase Price</option>
                            <option value="loan_amount">Loan Amount</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Row 2: Description */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--cui-secondary-color)' }}>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                    style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                    placeholder="-"
                    rows={2}
                  />
                </div>

                {/* Row 3: Scope Level Switch - label and switch together */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {formData.scope_level === 'global' ? (
                      <Globe size={16} style={{ color: 'var(--cui-secondary-color)' }} />
                    ) : (
                      <User size={16} style={{ color: 'var(--cui-secondary-color)' }} />
                    )}
                    <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                      {formData.scope_level === 'global' ? 'Global Default' : 'Custom'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newScope = formData.scope_level === 'global' ? 'project' : 'global';
                      console.log('[BenchmarkAccordion] Toggling scope_level from', formData.scope_level, 'to', newScope);
                      setFormData({
                        ...formData,
                        scope_level: newScope
                      });
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      backgroundColor: formData.scope_level === 'global'
                        ? 'var(--cui-primary, #0d6efd)'
                        : 'var(--cui-secondary-bg, #6c757d)'
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      style={{
                        transform: formData.scope_level === 'global' ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                      }}
                    />
                  </button>
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

  // View mode - Display with border
  const formatAmount = () => {
    const bm = benchmark as any;

    // Extract value from sale benchmark fields or legacy value field
    let value: number | null = null;
    let valueType = 'flat_fee';

    if (bm.rate_pct != null) {
      // Percentage type - convert 0.03 to 3 for display
      value = parseFloat(bm.rate_pct) * 100;
      valueType = 'percentage';
    } else if (bm.fixed_amount != null) {
      value = parseFloat(bm.fixed_amount);
      valueType = 'flat_fee';
    } else if (bm.amount_per_uom != null) {
      value = parseFloat(bm.amount_per_uom);
      valueType = 'per_unit';
    } else if (bm.value != null) {
      value = parseFloat(bm.value.toString());
      valueType = bm.value_type || 'flat_fee';
    }

    if (value == null) return '-';

    if (benchmark.category === 'transaction_cost' || benchmark.category === 'commission') {

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
    if (benchmark.category === 'transaction_cost' || benchmark.category === 'commission') {
      const bm = benchmark as any;

      // Determine value_type from which field is populated
      let valueType = 'flat_fee';
      if (bm.rate_pct != null) {
        valueType = 'percentage';
      } else if (bm.fixed_amount != null) {
        valueType = 'flat_fee';
      } else if (bm.amount_per_uom != null) {
        valueType = 'per_unit';
      } else if (bm.value_type) {
        // Legacy benchmark with explicit value_type
        valueType = bm.value_type;
      }

      const basis = bm.basis;

      if (valueType === 'flat_fee') {
        return '$$';
      } else if (valueType === 'percentage') {
        if (basis) {
          // Format basis for display: "net_sale_price" -> "Net Sale Price"
          const formattedBasis = basis
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          return `% of ${formattedBasis}`;
        }
        return '% of';
      } else if (valueType === 'per_unit') {
        return '$/Unit';
      }
    }
    return benchmark.uom_code || '-';
  };

  const amountDisplay = formatAmount();
  const typeDisplay = formatType();

  // Determine scope icon
  const scopeLevel = benchmark.scope_level || (benchmark.source_type === 'global_default' ? 'global' : 'project');
  const ScopeIcon = scopeLevel === 'global' ? Globe : User;

  return (
    <div
      className="w-full px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      style={{ borderColor: 'var(--cui-border-color)' }}
    >
      <div className="flex items-center w-full">
        {/* Item Name */}
        <div className="flex-1">
          <span className="text-sm font-medium">
            {benchmark.benchmark_name}
          </span>
          {ageMonths > 0 && (
            <span className={`text-xs font-medium ${ageColor} ml-2`}>
              {ageMonths}mo
            </span>
          )}
        </div>

        {/* Icon - to the right of item name */}
        <div className="w-8 flex justify-center ml-2">
          <ScopeIcon size={16} style={{ color: 'var(--cui-secondary-color)' }} />
        </div>

        {/* Amount */}
        <div className="w-20 text-right ml-2">
          <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            {amountDisplay}
          </span>
        </div>

        {/* Type */}
        <div className="w-40 text-right ml-3">
          <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            {typeDisplay}
          </span>
        </div>

        {/* Actions */}
        <div className="w-16 flex items-center justify-center gap-2 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
              setIsEditing(true);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit"
          >
            <Pencil size={14} style={{ color: 'var(--cui-secondary-color)' }} />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (confirm(`Delete "${benchmark.benchmark_name}"? This action cannot be undone.`)) {
                try {
                  // Determine endpoint: if benchmark has scope_level, it's from tbl_sale_benchmarks
                  const endpoint = benchmark.scope_level
                    ? `/api/sale-benchmarks/${benchmark.benchmark_id}`
                    : `/api/benchmarks/${benchmark.benchmark_id}`;

                  console.log('Deleting benchmark:', { benchmark_id: benchmark.benchmark_id, endpoint, scope_level: benchmark.scope_level });

                  const response = await fetch(endpoint, { method: 'DELETE' });

                  console.log('Delete response:', response.status, response.statusText);

                  if (response.ok) {
                    onRefresh?.();
                  } else {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to delete benchmark' }));
                    console.error('Delete failed:', errorData);
                    alert(errorData.error || errorData.detail || 'Failed to delete benchmark');
                  }
                } catch (error) {
                  console.error('Delete error:', error);
                  alert(`Failed to delete benchmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Delete"
          >
            <X size={14} style={{ color: 'var(--cui-danger-color, #dc3545)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
