/**
 * Land Use Pricing Table
 * Manages product-specific pricing assumptions with growth rates
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  usePricingAssumptions,
  useSavePricingAssumptions,
  useDeletePricingAssumption,
  useParcelProductTypes,
  useGrowthRateBenchmarks,
} from '@/hooks/useSalesAbsorption';
import { useMeasureOptions } from '@/hooks/useMeasures';
import type { PricingAssumption } from '@/types/sales-absorption';
import { formatMoney } from '@/utils/formatters/number';
import { Trash2, Plus, Save, X } from 'lucide-react';

interface Props {
  projectId: number;
  phaseFilters?: number[];
}

// Hardcoded growth rate options
const GROWTH_RATES = [
  { value: 0.025, label: '2.5%' },
  { value: 0.030, label: '3.0%' },
  { value: 0.035, label: '3.5%' },
  { value: 0.040, label: '4.0%' },
  { value: 0.045, label: '4.5%' },
  { value: 0.050, label: '5.0%' },
];

// Hardcoded UOM options (fallback if API fails)
const UOM_OPTIONS_FALLBACK = [
  { value: 'FF', label: 'FF - Front Foot' },
  { value: 'SF', label: 'SF - Square Foot' },
  { value: 'AC', label: 'AC - Acre' },
  { value: 'EA', label: 'EA - Each' },
];

// Extracted component for editable price cell to avoid hooks-in-render-prop violation
function EditablePriceCell({
  value,
  onSave
}: {
  value: number | null;
  onSave: (newValue: number | null) => void;
}) {
  const [localValue, setLocalValue] = React.useState<string>('');
  const [isFocused, setIsFocused] = React.useState(false);

  // Sync from prop value when not actively editing
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value ? String(value) : '');
    }
  }, [value, isFocused]);

  // Format display value with currency formatting
  const getDisplayValue = () => {
    if (isFocused) {
      return localValue;
    }
    if (!value) return '';

    // Format as currency: show decimals only if value has them
    const numValue = Number(value);
    const hasDecimals = numValue % 1 !== 0;
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = localValue === '' ? null : parseFloat(localValue.replace(/,/g, ''));
    if (numValue !== value) {
      onSave(numValue);
    }
  };

  return (
    <div className="text-right px-2">
      <div className="relative inline-flex items-center w-full">
        <span className="absolute left-2 text-sm pointer-events-none" style={{ color: 'var(--cui-secondary-color)' }}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={getDisplayValue()}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          style={{
            textAlign: 'right',
            paddingLeft: '1.5rem',
            width: '100%',
            borderColor: 'var(--cui-border-color)',
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)',
          }}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}

export default function PricingTable({ projectId, phaseFilters }: Props) {
  const { data: assumptions, isLoading, error } = usePricingAssumptions(projectId);
  const { data: parcelProducts, isLoading: isLoadingProducts } = useParcelProductTypes(
    projectId,
    phaseFilters && phaseFilters.length > 0 ? phaseFilters : null
  );
  const { options: uomOptions, isLoading: isLoadingMeasures } = useMeasureOptions(true);
  const { data: growthRateBenchmarks } = useGrowthRateBenchmarks();
  const saveMutation = useSavePricingAssumptions();
  const deleteMutation = useDeletePricingAssumption();

  const [editingRows, setEditingRows] = useState<PricingAssumption[]>([]);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customGrowthRate, setCustomGrowthRate] = useState<string>('');

  // Use API UOM options or fallback
  const uomChoices = uomOptions.length > 0 ? uomOptions : UOM_OPTIONS_FALLBACK;

  // Build growth rate options: combine hardcoded + benchmarks
  const growthRateOptions = useMemo(() => {
    const options = [...GROWTH_RATES]; // Start with hardcoded

    // Add flat-rate benchmarks from API
    if (growthRateBenchmarks && Array.isArray(growthRateBenchmarks)) {
      growthRateBenchmarks.forEach((benchmark: any) => {
        if (benchmark.rate_type === 'flat' && benchmark.current_rate !== null) {
          const rate = Number(benchmark.current_rate);
          // Only add if not already in list
          if (!options.some(opt => Math.abs(opt.value - rate) < 0.0001)) {
            options.push({
              value: rate,
              label: `${(rate * 100).toFixed(1)}% (${benchmark.set_name})`,
            });
          }
        }
      });
    }

    // Sort by value
    return options.sort((a, b) => a.value - b.value);
  }, [growthRateBenchmarks]);

  // Initialize editing rows: merge parcel products with existing pricing assumptions
  useEffect(() => {
    if (!parcelProducts) return;

    if (parcelProducts.length > 0) {
      // Create rows for each actual parcel product combination
      const rows: PricingAssumption[] = parcelProducts.map(product => {
        // Check if we have existing pricing for this type/product combo
        // Ensure assumptions is an array before calling .find()
        const existing = Array.isArray(assumptions) ? assumptions.find(
          a => a.lu_type_code === product.type_code &&
               (a.product_code || '') === (product.product_code || '')
        ) : undefined;

        if (existing) {
          // Use existing pricing data (with cleanup)
          return {
            ...existing,
            product_code: existing.product_code || '',
            growth_rate: existing.growth_rate || 0.035,
          };
        } else {
          // Create new row with defaults
          const defaultGrowthRate =
            product.family_name === 'Residential' ? 0.035 : 0.040;

          return {
            project_id: projectId,
            lu_type_code: product.type_code,
            product_code: product.product_code || '',
            price_per_unit: 0,
            unit_of_measure: 'FF',
            growth_rate: defaultGrowthRate,
          };
        }
      });

      setEditingRows(rows);
      // Don't auto-mark as unsaved on initial load
      setHasUnsavedChanges(false);
    } else {
      // Clear rows when no parcel products (e.g., filtered to nothing)
      setEditingRows([]);
      setHasUnsavedChanges(false);
    }
  }, [assumptions, parcelProducts, projectId]);

  const handleCellChange = (rowIndex: number, field: keyof PricingAssumption, value: any) => {
    setEditingRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: value };
      return updated;
    });
    // Defer setting unsaved changes to avoid immediate re-render during typing
    setTimeout(() => setHasUnsavedChanges(true), 0);
  };

  const handleAddRow = () => {
    const newRow: PricingAssumption = {
      project_id: projectId,
      lu_type_code: '',
      product_code: '',
      price_per_unit: 0,
      unit_of_measure: 'FF',
      growth_rate: 0.035, // Default 3.5%
    };
    setEditingRows(prev => [...prev, newRow]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const row = editingRows[rowIndex];

    if (row.id) {
      // Confirm deletion
      if (!confirm(`Delete pricing for ${row.lu_type_code} - ${row.product_code}?`)) {
        return;
      }

      try {
        await deleteMutation.mutateAsync({ projectId, id: row.id });
        setEditingRows(prev => prev.filter((_, i) => i !== rowIndex));
      } catch (err) {
        alert('Failed to delete pricing assumption');
      }
    } else {
      // Just remove from local state (not saved yet)
      setEditingRows(prev => prev.filter((_, i) => i !== rowIndex));
    }
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    // Validate all rows
    const invalidRows = editingRows.filter(
      row => !row.lu_type_code || row.price_per_unit <= 0 || !row.unit_of_measure
    );

    if (invalidRows.length > 0) {
      alert('Please fill in all required fields (Use Type, Price > 0, UOM) before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        projectId,
        assumptions: editingRows,
      });
      setHasUnsavedChanges(false);
      setEditingRowId(null);
      // Success toast would go here
    } catch (err) {
      alert('Failed to save pricing assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) {
      return;
    }
    // Reset to original data
    window.location.reload();
  };

  const columns = useMemo<ColumnDef<PricingAssumption>[]>(
    () => [
      {
        accessorKey: 'lu_type_code',
        header: () => <div className="text-center">Use<br />Type</div>,
        size: 100,
        cell: ({ row }) => {
          const value = row.original.lu_type_code;
          const rowIndex = row.index;
          const isEditing = editingRowId === rowIndex;

          // Get family_name from parcelProducts for color coding
          const product = parcelProducts?.find(
            p => p.type_code === value &&
                 (p.product_code || '') === (row.original.product_code || '')
          );
          const familyName = product?.family_name;

          // Match ParcelSalesTable color scheme with CSS variables
          const chipColor =
            familyName === 'Residential' ? 'var(--cui-primary)' :
            familyName === 'Commercial' ? 'var(--cui-warning)' :
            familyName === 'Industrial' ? 'var(--cui-info)' :
            'var(--cui-secondary)';

          const chipBg =
            familyName === 'Residential' ? 'var(--cui-primary-bg)' :
            familyName === 'Commercial' ? 'var(--cui-warning-bg)' :
            familyName === 'Industrial' ? 'var(--cui-info-bg)' :
            'var(--cui-tertiary-bg)';

          return (
            <div className="text-center">
              <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: chipBg, color: chipColor }}>
                {value || 'N/A'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'product_code',
        header: 'Product',
        size: 200,
        cell: ({ row }) => {
          const value = row.original.product_code;
          return (
            <div className="text-left px-2">
              {value || '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'unit_of_measure',
        header: () => <div className="text-center">UOM</div>,
        size: 100,
        cell: ({ row }) => {
          const value = row.original.unit_of_measure;
          const rowIndex = row.index;
          const isEditing = editingRowId === rowIndex;

          if (isEditing) {
            return (
              <div className="text-center">
                <select
                  value={value || 'FF'}
                  onChange={(e) => handleCellChange(rowIndex, 'unit_of_measure', e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {uomChoices.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div className="text-center text-sm cursor-pointer" onClick={() => setEditingRowId(rowIndex)}>
              {value || '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'price_per_unit',
        header: () => <div className="text-right">Current<br />Price</div>,
        size: 140,
        cell: ({ row }) => {
          const value = row.original.price_per_unit;
          const rowIndex = row.index;

          return (
            <EditablePriceCell
              value={value}
              onSave={(newValue) => handleCellChange(rowIndex, 'price_per_unit', newValue || 0)}
            />
          );
        },
      },
      {
        accessorKey: 'growth_rate',
        header: () => <div className="text-center">Growth<br />Rate</div>,
        size: 110,
        cell: ({ row }) => {
          const value = row.original.growth_rate;
          const rowIndex = row.index;
          const isEditing = editingRowId === rowIndex;

          if (isEditing) {
            // Check if current value is in options list
            const isCustomRate = !growthRateOptions.some(opt => Math.abs(opt.value - (value || 0)) < 0.0001);

            return (
              <div className="text-center flex flex-col gap-1">
                <select
                  value={isCustomRate ? 'custom' : String(value || 0.035)}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setCustomGrowthRate(String((value || 0.035) * 100));
                    } else {
                      handleCellChange(rowIndex, 'growth_rate', parseFloat(e.target.value));
                      setCustomGrowthRate('');
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {growthRateOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
                {(isCustomRate || customGrowthRate !== '') && (
                  <div className="flex justify-center">
                    <input
                      type="text"
                      value={isCustomRate ? ((value || 0) * 100).toFixed(2) : customGrowthRate}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/%/g, '');
                        if (rawValue === '' || !isNaN(Number(rawValue))) {
                          const numValue = Number(rawValue) / 100;
                          handleCellChange(rowIndex, 'growth_rate', numValue);
                          setCustomGrowthRate(rawValue);
                        }
                      }}
                      placeholder="%"
                      className="w-1/2 px-2 py-1 text-sm text-center border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            );
          }

          const percentage = ((value || 0) * 100).toFixed(1);
          return (
            <div className="text-center text-sm tnum cursor-pointer" onClick={() => setEditingRowId(rowIndex)}>
              {percentage}%
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        cell: ({ row }) => {
          const rowIndex = row.index;
          return (
            <div className="text-center">
              <button
                onClick={() => handleDeleteRow(rowIndex)}
                className="p-1 rounded transition-colors"
                style={{
                  color: 'var(--cui-secondary-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--cui-danger)';
                  e.currentTarget.style.backgroundColor = 'var(--cui-danger-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--cui-secondary-color)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Delete pricing"
                disabled={isSaving}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [parcelProducts, editingRowId, uomChoices, isSaving, growthRateOptions, customGrowthRate]
  );

  const table = useReactTable({
    data: editingRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading || isLoadingProducts) {
    return (
      <div className="rounded border p-4" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <div className="animate-pulse space-y-3">
          <div className="h-8 rounded w-full" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded" style={{ backgroundColor: 'var(--cui-danger-bg)', borderColor: 'var(--cui-danger)', color: 'var(--cui-danger)' }}>
        <p>Failed to load pricing assumptions</p>
      </div>
    );
  }

  // Empty state - only show if no parcel products exist
  if ((!editingRows || editingRows.length === 0) && (!parcelProducts || parcelProducts.length === 0)) {
    return (
      <div className="rounded border p-8 text-center" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <div className="mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
          <p className="text-lg font-medium">No parcels configured</p>
          <p className="text-sm mt-2">Add parcels to the project first, then pricing will auto-populate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      {/* Header with action buttons */}
      <div className="px-4 py-3 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Land Use Pricing Assumptions
        </h3>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 flex items-center gap-1"
                style={{
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-card-bg)',
                  borderColor: 'var(--cui-border-color)',
                }}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm rounded disabled:opacity-50 flex items-center gap-1"
                style={{
                  color: 'white',
                  backgroundColor: 'var(--cui-primary)',
                }}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : `Save Changes (${editingRows.filter(r => !r.id || hasUnsavedChanges).length})`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 font-medium"
                    style={{
                      color: 'var(--cui-body-color)',
                      width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isEditing = editingRowId === row.index;
              const isNew = !row.original.id;
              const rowBg = isEditing
                ? 'var(--cui-primary-bg)'
                : isNew
                ? 'var(--cui-success-bg)'
                : 'var(--cui-card-bg)';

              return (
                <tr
                  key={row.id}
                  className="border-b transition-colors"
                  style={{
                    borderColor: 'var(--cui-border-color)',
                    backgroundColor: rowBg,
                  }}
                  onMouseEnter={(e) => {
                    if (!isEditing && !isNew) {
                      e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isEditing && !isNew) {
                      e.currentTarget.style.backgroundColor = 'var(--cui-card-bg)';
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with Add button */}
      <div className="px-4 py-3 border-t flex justify-between items-center" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)' }}>
        <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          {editingRows.length} pricing assumption(s)
        </span>
        <button
          onClick={handleAddRow}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm rounded disabled:opacity-50 flex items-center gap-1"
          style={{
            color: 'var(--cui-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--cui-primary-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus className="w-4 h-4" />
          Add Pricing
        </button>
      </div>
    </div>
  );
}
