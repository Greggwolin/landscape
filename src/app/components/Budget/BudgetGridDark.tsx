'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

// Types
interface BudgetItem {
  fact_id: number;
  budget_version: string;
  cost_code: string;
  scope: string;
  category_path: string;
  category_depth: number;
  category_id?: number;
  description?: string;
  uom_code: string;
  uom_display: string;
  qty: number;
  rate: number;
  amount: number;
  calculated_amount: number;
  start_date: string;
  end_date: string;
  duration_months: number;
  escalation_rate: number;
  contingency_pct: number;
  timing_method: string;
  confidence_level: string;
  notes: string;
  vendor_name: string;
  original_amount?: number;
  variance_amount?: number;
  variance_percent?: number;
  variance_status?: 'under' | 'over' | 'on_budget';
  parent_category_name?: string;
  parent_category_code?: string;
  isNew?: boolean;
  isDirty?: boolean;
}

interface Division {
  division_type: 'Area' | 'Phase';
  id: string;
  name: string;
  parent_id: string | null;
}

interface BudgetGridDarkProps {
  projectId: number;
}

export default function BudgetGridDark({ projectId }: BudgetGridDarkProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetVersion, setBudgetVersion] = useState<string>('Forecast');

  // Divisions (Areas & Phases)
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string>('');

  // Three-level filtering: Stage > Scope > Category
  const [stageFilter, setStageFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Edit tracking
  const [editedItems, setEditedItems] = useState<Record<number, Partial<BudgetItem>>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Budget comparison
  const [showComparison, setShowComparison] = useState(false);
  const [availableBudgets, setAvailableBudgets] = useState<string[]>(['Forecast']); // Would come from API

  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch divisions (areas & phases) - stub for now
  useEffect(() => {
    setDivisions([
      { division_type: 'Area', id: '4', name: 'Planning Area 1', parent_id: null },
      { division_type: 'Area', id: '5', name: 'Planning Area 2', parent_id: null },
      { division_type: 'Phase', id: '1', name: '1.1', parent_id: '4' },
      { division_type: 'Phase', id: '2', name: '1.2', parent_id: '4' },
    ]);
  }, [projectId]);

  // Fetch budget items
  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          version: budgetVersion,
          includeVariance: 'true'
        });
        if (scopeFilter) params.set('scope', scopeFilter);

        const response = await fetch(
          `/api/budget/items/${projectId}?${params.toString()}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch budget items');
        }

        setItems(data.data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [projectId, budgetVersion, scopeFilter]);

  // Stage mapping
  const stages = useMemo(() => {
    const stageMap: Record<string, string[]> = {
      'Acquisition': ['Purchase', 'Diligence', 'Other'],
      'Stage 1': ['Entitlements'],
      'Stage 2': ['Engineering'],
      'Stage 3': ['Offsites', 'Onsites', 'Subdivision', 'Exactions'],
      'Project-Wide': ['Management Fees', 'Overhead', 'Capital Cost / Interest']
    };
    return stageMap;
  }, []);

  // Get unique scopes from items
  const uniqueScopes = useMemo(() => {
    return [...new Set(items.map(item => item.scope))].sort();
  }, [items]);

  // Get scopes for selected stage
  const scopesForStage = useMemo(() => {
    if (!stageFilter) return uniqueScopes;
    return stages[stageFilter] || [];
  }, [stageFilter, stages, uniqueScopes]);

  // Get unique categories for selected scope
  const categoriesForScope = useMemo(() => {
    if (!scopeFilter) return [];
    const filtered = items.filter(item => item.scope === scopeFilter);
    return [...new Set(filtered.map(item => item.parent_category_name || item.category_path))].sort();
  }, [scopeFilter, items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (stageFilter) {
        const scopesInStage = stages[stageFilter] || [];
        if (!scopesInStage.includes(item.scope)) return false;
      }
      if (scopeFilter && item.scope !== scopeFilter) return false;
      if (categoryFilter) {
        const itemCategory = item.parent_category_name || item.category_path;
        if (itemCategory !== categoryFilter) return false;
      }
      return true;
    });
  }, [items, stageFilter, scopeFilter, categoryFilter, stages]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalAmount = filteredItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalOriginal = filteredItems.reduce((sum, item) => sum + (Number(item.original_amount) || 0), 0);
    const variance = totalAmount - totalOriginal;
    const variancePct = totalOriginal > 0 ? (variance / totalOriginal) * 100 : 0;

    return { itemCount: filteredItems.length, totalAmount, totalOriginal, variance, variancePct };
  }, [filteredItems]);

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  // Format number
  const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setStageFilter('');
    setScopeFilter('');
    setCategoryFilter('');
    setDivisionFilter('');
  };

  // Handle field edit
  const handleFieldEdit = (factId: number, field: string, value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [factId]: {
        ...prev[factId],
        [field]: value
      }
    }));
  };

  // Handle add row
  const handleAddRow = (templateItem: BudgetItem) => {
    const newId = -Date.now(); // Temporary negative ID for new items
    const newItem: BudgetItem = {
      ...templateItem,
      fact_id: newId,
      description: '',
      qty: 0,
      rate: 0,
      amount: 0,
      notes: '',
      isNew: true,
      isDirty: true
    };
    setItems(prev => [...prev, newItem]);
    setEditedItems(prev => ({ ...prev, [newId]: newItem }));
  };

  // Handle delete
  const handleDeleteClick = (factId: number) => {
    setItemToDelete(factId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete < 0) {
        // New item, just remove from state
        setItems(prev => prev.filter(item => item.fact_id !== itemToDelete));
        setEditedItems(prev => {
          const next = { ...prev };
          delete next[itemToDelete];
          return next;
        });
      } else {
        // Existing item, call API
        const response = await fetch(`/api/budget/item/${itemToDelete}`, {
          method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
          setItems(prev => prev.filter(item => item.fact_id !== itemToDelete));
        } else {
          alert(data.error || 'Failed to delete item');
        }
      }
    } catch (err) {
      alert('Failed to delete item');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Handle save
  const handleSave = async (item: BudgetItem) => {
    const edits = editedItems[item.fact_id] || {};
    const mergedItem = { ...item, ...edits };

    try {
      if (item.isNew) {
        // Create new item via POST
        const response = await fetch('/api/budget/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetId: 4, // Forecast budget
            projectId,
            containerId: null,
            categoryId: mergedItem.category_id,
            uomCode: mergedItem.uom_code,
            qty: mergedItem.qty,
            rate: mergedItem.rate,
            amount: mergedItem.amount,
            notes: mergedItem.description || mergedItem.notes
          })
        });
        const data = await response.json();

        if (data.success) {
          // Replace temporary item with real one
          setItems(prev => prev.map(i =>
            i.fact_id === item.fact_id ? { ...data.data.item, isNew: false, isDirty: false } : i
          ));
          setEditedItems(prev => {
            const next = { ...prev };
            delete next[item.fact_id];
            return next;
          });
        } else {
          alert(data.error || 'Failed to create item');
        }
      } else {
        // Update existing item via PUT
        const response = await fetch(`/api/budget/item/${item.fact_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edits)
        });
        const data = await response.json();

        if (data.success) {
          setItems(prev => prev.map(i =>
            i.fact_id === item.fact_id ? { ...data.data.item, isDirty: false } : i
          ));
          setEditedItems(prev => {
            const next = { ...prev };
            delete next[item.fact_id];
            return next;
          });
        } else {
          alert(data.error || 'Failed to update item');
        }
      }
    } catch (err) {
      alert('Failed to save item');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-4 text-gray-400">Loading budget items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
        <div className="text-red-400 text-center">
          <p className="font-semibold">Error loading budget</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Filters & Summary Bar */}
      <div className="bg-gray-750 border-b border-gray-700 p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Filter Controls */}
          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Budget Version */}
            <div className="min-w-[220px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">Budget Version</label>
              <select
                value={budgetVersion}
                onChange={(e) => setBudgetVersion(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Original">Original</option>
                <option value="Forecast">Forecast</option>
              </select>
            </div>

            {/* Geography Filter */}
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">Geography</label>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Project (All)</option>
                {divisions.filter(d => d.division_type === 'Area').map(area => (
                  <option key={`area-${area.id}`} value={`area-${area.id}`}>📍 {area.name}</option>
                ))}
                {divisions.filter(d => d.division_type === 'Phase').map(phase => (
                  <option key={`phase-${phase.id}`} value={`phase-${phase.id}`}>&nbsp;&nbsp;&nbsp;&nbsp;📅 Phase {phase.name}</option>
                ))}
              </select>
            </div>

            {/* Stage Filter */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setScopeFilter(''); setCategoryFilter(''); }}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Stages</option>
                {Object.keys(stages).map(stage => (<option key={stage} value={stage}>{stage}</option>))}
              </select>
            </div>

            {/* Scope Filter */}
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">Scope</label>
              <select
                value={scopeFilter}
                onChange={(e) => { setScopeFilter(e.target.value); setCategoryFilter(''); }}
                disabled={!stageFilter && scopesForStage.length === 0}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Scopes</option>
                {scopesForStage.map(scope => (<option key={scope} value={scope}>{scope}</option>))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={!scopeFilter || categoriesForScope.length === 0}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Categories</option>
                {categoriesForScope.map(category => (<option key={category} value={category}>{category}</option>))}
              </select>
            </div>

          </div>

          {/* Summary */}
          <div className="text-right min-w-[200px]">
            <div className="text-xs text-gray-400">{summary.itemCount} line items</div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(summary.totalAmount)}
            </div>
            {budgetVersion === 'Forecast' && summary.totalOriginal > 0 && (
              <div className={`text-sm ${summary.variance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {summary.variance >= 0 ? '+' : ''}{formatCurrency(summary.variance)}
                {' '}({summary.variancePct >= 0 ? '+' : ''}{summary.variancePct.toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(divisionFilter || stageFilter || scopeFilter || categoryFilter) && (
          <div className="flex gap-2 mt-2 items-center">
            {divisionFilter && (() => {
              const division = divisions.find(d => `${d.division_type.toLowerCase()}-${d.id}` === divisionFilter);
              const label = division
                ? (division.division_type === 'Area' ? `Area: ${division.name}` : `Phase: ${division.name}`)
                : 'Geography';
              return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/40 border border-blue-700 text-blue-300 rounded text-xs">
                  {label}
                  <button onClick={() => setDivisionFilter('')} className="hover:text-blue-200">✕</button>
                </span>
              );
            })()}
            {stageFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/40 border border-green-700 text-green-300 rounded text-xs">
                Stage: {stageFilter}
                <button onClick={() => setStageFilter('')} className="hover:text-green-200">✕</button>
              </span>
            )}
            {scopeFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-900/40 border border-orange-700 text-orange-300 rounded text-xs">
                Scope: {scopeFilter}
                <button onClick={() => setScopeFilter('')} className="hover:text-orange-200">✕</button>
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/40 border border-purple-700 text-purple-300 rounded text-xs">
                Category: {categoryFilter}
                <button onClick={() => setCategoryFilter('')} className="hover:text-purple-200">✕</button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded text-sm transition-colors"
            >
              Clear Filters ✕
            </button>
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <table className="w-full text-sm">
          <thead className="bg-gray-700 sticky top-0 z-10">
            <tr className="border-b border-gray-600">
              <th className="px-6 py-4 text-left font-semibold text-gray-300 text-xs" style={{ width: '160px' }}>Scope</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-300 text-xs" style={{ width: '176px' }}>Category</th>
              <th className="px-3 py-4 text-left font-semibold text-gray-300 text-xs" style={{ width: '108px' }}>Description</th>
              <th className="px-3 py-4 text-center font-semibold text-gray-300 text-xs" style={{ width: '64px' }}>UOM</th>
              <th className="px-3 py-4 text-center font-semibold text-gray-300 text-xs" style={{ width: '96px' }}>Units</th>
              <th className="px-4 py-4 text-right font-semibold text-gray-300 text-xs" style={{ width: '112px' }}>Rate</th>
              <th className="px-4 py-4 text-right font-semibold text-gray-300 text-xs relative" style={{ width: '112px' }}>
                Amount
                {availableBudgets.length > 1 && (
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className={`absolute top-1 right-1 px-2 py-0.5 text-[10px] rounded transition-colors ${
                      showComparison
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Compare Budgets
                  </button>
                )}
              </th>
              {showComparison && (
                <>
                  <th className="px-4 py-4 text-right font-semibold text-gray-300 text-xs" style={{ width: '128px' }}>Original</th>
                  <th className="px-4 py-4 text-right font-semibold text-gray-300 text-xs" style={{ width: '128px' }}>Variance</th>
                </>
              )}
              <th className="px-4 py-4 text-center font-semibold text-gray-300 text-xs" style={{ width: '224px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const varianceColor =
                item.variance_status === 'over' ? 'text-red-400' :
                item.variance_status === 'under' ? 'text-green-400' :
                'text-gray-400';
              const edits = editedItems[item.fact_id] || {};
              const hasEdits = Object.keys(edits).length > 0;
              const showSave = item.isNew || hasEdits;

              return (
                <tr
                  key={item.fact_id}
                  className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${item.isNew ? 'bg-gray-700/30' : ''}`}
                  style={{ height: '36px' }}
                >
                  <td className="px-6 py-3 text-gray-300 text-xs">{item.scope}</td>
                  <td className="px-6 py-3 text-gray-300 text-xs" title={item.category_path}>
                    {item.category_path}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ width: '108px' }}>
                    <input
                      type="text"
                      value={edits.description ?? item.description ?? ''}
                      onChange={(e) => handleFieldEdit(item.fact_id, 'description', e.target.value)}
                      placeholder="Enter description..."
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ minHeight: '28px' }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{item.uom_code}</td>
                  <td className="px-4 py-3 text-right text-gray-300 text-xs">{formatNumber(item.qty)}</td>
                  <td className="px-4 py-3 text-right text-gray-300 text-xs">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-3 text-right text-white font-semibold text-xs">
                    {formatCurrency(item.amount)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {formatCurrency(item.original_amount)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium text-xs ${varianceColor}`}>
                        {item.variance_amount !== undefined && item.variance_amount !== 0
                          ? formatCurrency(item.variance_amount)
                          : '-'}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => alert('Document management coming soon')}
                        className="inline-flex items-center justify-center w-7 h-6 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                      >
                        📎
                      </button>
                      <button
                        onClick={() => handleAddRow(item)}
                        className="inline-flex items-center justify-center w-7 h-6 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                      >
                        ➕
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.fact_id)}
                        className="inline-flex items-center justify-center w-7 h-6 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                      >
                        🗑️
                      </button>
                      {showSave && (
                        <button
                          onClick={() => handleSave(item)}
                          className="inline-flex items-center justify-center w-7 h-6 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                        >
                          💾
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">Confirm Delete</h3>
            <p className="text-gray-300 text-sm mb-6">
              Are you sure you want to delete this budget line item? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
