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
  onAddNew
}: Props) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newFormData, setNewFormData] = React.useState({
    benchmark_name: '',
    value: '',
    cost_type: '',
    value_type: 'flat_fee' as 'percentage' | 'flat_fee' | 'per_unit',
    basis: '', // For "% of what" field
    uom_code: '$/SF',
    description: '',
    cost_phase: '',
    work_type: '',
  });
  const [saving, setSaving] = React.useState(false);

  // Calculate stale count (>730 days = 24 months)
  const staleCount = benchmarks.filter(b => (b.age_days || 0) > 730).length;

  const handleAddNew = async () => {
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
      }

      const response = await fetch('/api/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewFormData({
          benchmark_name: '',
          value: '',
          cost_type: '',
          value_type: 'flat_fee',
          basis: '',
          uom_code: '$/SF',
          description: '',
          cost_phase: '',
          work_type: '',
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewFormData({
      benchmark_name: '',
      value: '',
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
    <div className="border-b border-slate-700">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={20} className="text-slate-400" />
          ) : (
            <ChevronRight size={20} className="text-slate-400" />
          )}
          <span className="font-medium">{category.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {staleCount > 0 && (
            <span className="text-xs text-red-400 font-semibold">
              {staleCount} stale
            </span>
          )}
          <span className="text-sm text-slate-400">{category.count}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-slate-850 px-4 py-2">
          {benchmarks.length === 0 && !showAddForm ? (
            <div className="text-sm text-slate-400 py-4 text-center">
              No benchmarks yet. Click "Add New" to create.
            </div>
          ) : (
            <div className="space-y-1">
              {/* Column Headers */}
              <div className="flex items-center w-full px-3 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <span className="w-48">Item</span>
                <span className="w-32 text-right">Amount</span>
                <span className="w-32 ml-4">Factor</span>
              </div>
              {benchmarks.map(benchmark => (
                <BenchmarkListItem
                  key={benchmark.benchmark_id}
                  benchmark={benchmark}
                  onClick={() => onBenchmarkClick(benchmark)}
                />
              ))}
            </div>
          )}

          {/* Add New Form - Inline */}
          {showAddForm ? (
            <div className="mt-2 w-full px-3 py-3 rounded bg-slate-800 border border-blue-500">
              {category.key === 'transaction_cost' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Name</label>
                      <input
                        type="text"
                        value={newFormData.benchmark_name || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, benchmark_name: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Amount</label>
                      <input
                        type="text"
                        value={newFormData.value || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, value: formatValueInput(e.target.value, newFormData.value_type) })}
                        onFocus={(e) => e.target.select()}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-right"
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Type</label>
                      <select
                        value={newFormData.value_type}
                        onChange={(e) => setNewFormData({ ...newFormData, value_type: e.target.value as any })}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
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
                      <label className="text-xs text-slate-400">Select Factor to Apply Percentage</label>
                      <select
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-slate-500"
                        disabled
                      >
                        <option>Coming Soon</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Description</label>
                    <textarea
                      value={newFormData.description || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                      placeholder="-"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name || !newFormData.value}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded"
                    >
                      {saving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : category.key === 'unit_cost' ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Name</label>
                    <input
                      type="text"
                      value={newFormData.benchmark_name || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, benchmark_name: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                      placeholder="-"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Amount</label>
                      <input
                        type="text"
                        value={newFormData.value || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, value: formatValueInput(e.target.value, 'per_unit') })}
                        onFocus={(e) => e.target.select()}
                        className="w-32 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-right"
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                      <select
                        value={newFormData.uom_code}
                        onChange={(e) => setNewFormData({ ...newFormData, uom_code: e.target.value })}
                        className="w-32 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
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
                      <label className="text-xs text-slate-400 mb-1 block">Cost Phase</label>
                      <input
                        type="text"
                        value={newFormData.cost_phase || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, cost_phase: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                        placeholder="-"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Work Type</label>
                      <input
                        type="text"
                        value={newFormData.work_type || ''}
                        onChange={(e) => setNewFormData({ ...newFormData, work_type: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                        placeholder="-"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Description</label>
                    <textarea
                      value={newFormData.description || ''}
                      onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                      placeholder="-"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name || !newFormData.value}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded"
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
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                    placeholder="-"
                  />
                  <textarea
                    value={newFormData.description || ''}
                    onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                    placeholder="-"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={saving || !newFormData.benchmark_name}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded"
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
              className="mt-2 w-full px-3 py-2 border border-slate-600 rounded text-sm hover:bg-slate-700 transition-colors"
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
  onClick
}: {
  benchmark: Benchmark;
  onClick: () => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    benchmark_name: benchmark.benchmark_name,
    value: benchmark.value?.toString() || '',
    cost_type: (benchmark as any).cost_type || '',
    value_type: (benchmark as any).value_type || 'flat_fee',
    basis: (benchmark as any).basis || '', // For "% of what" field
    uom_code: benchmark.uom_code || '$/SF',
    description: benchmark.description || '',
    cost_phase: (benchmark as any).cost_phase || '',
    work_type: (benchmark as any).work_type || '',
  });
  const [saving, setSaving] = React.useState(false);

  const ageDays = benchmark.age_days || 0;
  const ageMonths = Math.floor(ageDays / 30);
  const ageColor = ageDays < 365
    ? 'text-green-400'
    : ageDays < 730
    ? 'text-slate-400'
    : 'text-red-400';

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/benchmarks/${benchmark.benchmark_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          benchmark_name: formData.benchmark_name,
          value: parseFloat(formData.value),
          cost_type: formData.cost_type,
          value_type: formData.value_type,
          basis: formData.basis || undefined,
          uom_code: formData.uom_code,
          description: formData.description,
          cost_phase: formData.cost_phase,
          work_type: formData.work_type,
        })
      });

      if (response.ok) {
        setIsEditing(false);
        // Refresh parent
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      benchmark_name: benchmark.benchmark_name,
      value: benchmark.value?.toString() || '',
      cost_type: (benchmark as any).cost_type || '',
      value_type: (benchmark as any).value_type || 'flat_fee',
      uom_code: benchmark.uom_code || '$/SF',
      description: benchmark.description || '',
      cost_phase: (benchmark as any).cost_phase || '',
      work_type: (benchmark as any).work_type || '',
    });
    setIsEditing(false);
  };

  // Check if this is a built-in (standard cost type)
  const isBuiltIn = benchmark.category === 'transaction_cost' &&
    ['closing_costs', 'title_insurance', 'legal', 'due_diligence', 'broker_fee'].includes((benchmark as any).cost_type);

  // Edit mode - Inline form
  if (isEditing) {
    return (
      <div className="w-full px-3 py-3 rounded bg-slate-800 border border-slate-600">
        {benchmark.category === 'transaction_cost' ? (
          // Transaction Cost Edit Form
          <div className="space-y-2">
            {/* Row 1: Name (read-only for built-ins), Value, Unit */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Name</label>
                <input
                  type="text"
                  value={formData.benchmark_name || ''}
                  onChange={(e) => !isBuiltIn && setFormData({ ...formData, benchmark_name: e.target.value })}
                  disabled={isBuiltIn}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Amount</label>
                <input
                  type="text"
                  value={formData.value || ''}
                  onChange={(e) => {
                    const formatted = formatValueInput(e.target.value, formData.value_type);
                    setFormData({ ...formData, value: formatted });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-right"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select
                  value={formData.value_type}
                  onChange={(e) => setFormData({ ...formData, value_type: e.target.value as any })}
                  className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
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
                <label className="text-xs text-slate-400">Select Factor to Apply Percentage</label>
                <select
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-slate-500"
                  disabled
                >
                  <option>Coming Soon</option>
                </select>
              </div>
            )}

            {/* Row 3: Description */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                placeholder="-"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : benchmark.category === 'unit_cost' ? (
          // Unit Cost Edit Form
          <div className="space-y-2">
            {/* Row 1: Name */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Name</label>
              <input
                type="text"
                value={formData.benchmark_name || ''}
                onChange={(e) => setFormData({ ...formData, benchmark_name: e.target.value })}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                placeholder="-"
              />
            </div>

            {/* Row 2: Value, Unit */}
            <div className="flex gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Amount</label>
                <input
                  type="text"
                  value={formData.value || ''}
                  onChange={(e) => {
                    const formatted = formatValueInput(e.target.value, 'per_unit');
                    setFormData({ ...formData, value: formatted });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-32 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-right"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                <select
                  value={formData.uom_code}
                  onChange={(e) => setFormData({ ...formData, uom_code: e.target.value })}
                  className="w-32 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
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
                <label className="text-xs text-slate-400 mb-1 block">Cost Phase</label>
                <input
                  type="text"
                  value={formData.cost_phase || ''}
                  onChange={(e) => setFormData({ ...formData, cost_phase: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                  placeholder="-"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Work Type</label>
                <input
                  type="text"
                  value={formData.work_type || ''}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                  placeholder="-"
                />
              </div>
            </div>

            {/* Row 4: Description */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
                placeholder="-"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded"
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
              className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
              placeholder="-"
            />
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm"
              placeholder="-"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded"
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
        // No cents for $$ amounts
        const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return `$${formatted}`;
      } else if (valueType === 'per_unit') {
        // Show cents only if value < $10
        if (value < 10) {
          const formatted = value.toFixed(2);
          return `$${formatted}`;
        } else {
          const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          return `$${formatted}`;
        }
      }
      return `${value}`;
    }

    return `${benchmark.value} ${benchmark.uom_code || ''}`;
  };

  const formatFactor = () => {
    if (benchmark.category === 'transaction_cost') {
      const valueType = (benchmark as any).value_type;
      const basis = (benchmark as any).basis;

      if (valueType === 'flat_fee') {
        return 'Lump Sum';
      } else if (valueType === 'percentage') {
        return basis || 'Gross Sale Price';
      } else if (valueType === 'per_unit') {
        return '$/Unit';
      }
    }
    return benchmark.uom_code || '-';
  };

  const amountDisplay = formatAmount();
  const factorDisplay = formatFactor();

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="w-full px-3 py-2 rounded hover:bg-slate-700 flex items-center text-left transition-colors"
    >
      <div className="flex items-center w-full">
        <span className="text-sm font-medium w-48">{benchmark.benchmark_name}</span>
        <span className="text-sm text-slate-300 w-32 text-right">{amountDisplay}</span>
        <span className="text-sm text-slate-400 w-32 ml-4">{factorDisplay}</span>
        {ageMonths > 0 && (
          <span className={`text-xs font-medium ${ageColor} ml-auto`}>
            {ageMonths}mo
          </span>
        )}
      </div>
    </button>
  );
}
