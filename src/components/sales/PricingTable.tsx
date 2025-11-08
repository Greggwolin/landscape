/**
 * Land Use Pricing Table
 * Manages product-specific pricing assumptions with growth rates
 */

'use client';

import React, { useState, useMemo } from 'react';
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
} from '@/hooks/useSalesAbsorption';
import type { PricingAssumption } from '@/types/sales-absorption';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  projectId: number;
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

// Hardcoded UOM options
const UOM_OPTIONS = [
  { value: 'FF', label: 'FF (Front Foot)' },
  { value: 'SF', label: 'SF (Square Foot)' },
  { value: 'AC', label: 'AC (Acre)' },
  { value: 'EA', label: 'EA (Each)' },
];

export default function PricingTable({ projectId }: Props) {
  const { data: assumptions, isLoading, error } = usePricingAssumptions(projectId);
  const { data: parcelProducts, isLoading: isLoadingProducts } = useParcelProductTypes(projectId);
  const saveMutation = useSavePricingAssumptions();
  const deleteMutation = useDeletePricingAssumption();

  const [editingRows, setEditingRows] = useState<PricingAssumption[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize editing rows: merge parcel products with existing pricing assumptions
  useMemo(() => {
    if (!parcelProducts || editingRows.length > 0) return;

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
      // Only mark as unsaved if we created new rows without existing data
      const hasNewRows = rows.some(r => !r.id);
      setHasUnsavedChanges(hasNewRows);
    }
  }, [assumptions, parcelProducts, editingRows.length, projectId]);

  const handleCellChange = (rowIndex: number, field: keyof PricingAssumption, value: any) => {
    setEditingRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: value };
      return updated;
    });
    setHasUnsavedChanges(true);
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

    try {
      await saveMutation.mutateAsync({
        projectId,
        assumptions: editingRows,
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      alert('Failed to save pricing assumptions');
    }
  };

  // Calculate inflated value client-side for display
  const calculateInflated = (price: number, growthRate: number, createdAt?: string): number => {
    if (!createdAt || growthRate === 0) return price;

    const created = new Date(createdAt);
    const now = new Date();
    const yearsElapsed = (now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    return price * Math.pow(1 + growthRate, yearsElapsed);
  };

  const columns = useMemo<ColumnDef<PricingAssumption>[]>(
    () => [
      {
        accessorKey: 'lu_type_code',
        header: () => <div className="text-center">Use<br />Type</div>,
        size: 100,
        cell: ({ row }) => {
          const value = row.original.lu_type_code;
          // Get family_name from parcelProducts for color coding
          const product = parcelProducts?.find(
            p => p.type_code === value &&
                 (p.product_code || '') === (row.original.product_code || '')
          );
          const familyName = product?.family_name;

          // Match ParcelSalesTable color scheme
          const chipClass =
            familyName === 'Residential' ? 'bg-blue-900 text-blue-300' :
            familyName === 'Commercial' ? 'bg-purple-900 text-purple-300' :
            familyName === 'Industrial' ? 'bg-orange-900 text-orange-300' :
            'bg-indigo-900 text-indigo-300';

          return (
            <div className="text-center">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${chipClass}`}>
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
        size: 80,
        cell: ({ row }) => {
          const value = row.original.unit_of_measure;
          return (
            <div className="text-center text-sm">
              {value || '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'price_per_unit',
        header: () => <div className="text-right">Current<br />Price</div>,
        size: 120,
        cell: ({ row }) => {
          const value = row.original.price_per_unit;
          const uom = row.original.unit_of_measure;

          if (!value || value === 0) {
            return (
              <div className="text-right text-sm text-gray-400 italic px-2">
                Not set
              </div>
            );
          }

          return (
            <div className="text-right tnum text-sm px-2">
              {formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {uom && <span className="text-gray-500 ml-1">/{uom}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'growth_rate',
        header: () => <div className="text-center">Growth<br />Rate</div>,
        size: 90,
        cell: ({ row }) => {
          const value = row.original.growth_rate;
          const percentage = ((value || 0) * 100).toFixed(1);
          return (
            <div className="text-center text-sm tnum">
              {percentage}%
            </div>
          );
        },
      },
      {
        id: 'inflated_value',
        header: () => <div className="text-right">Inflated<br />Value</div>,
        size: 140,
        cell: ({ row }) => {
          const price = row.original.price_per_unit;
          const growthRate = row.original.growth_rate;
          const createdAt = row.original.created_at;
          const uom = row.original.unit_of_measure;

          if (!price || price === 0) {
            return (
              <div className="text-right text-sm text-gray-400 italic px-2">
                —
              </div>
            );
          }

          const inflated = calculateInflated(price, growthRate, createdAt);
          const displayValue = inflated > 0
            ? `${formatMoney(inflated, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /${uom}`
            : '—';

          return (
            <div className="text-right tnum text-sm px-2">
              {displayValue}
            </div>
          );
        },
      },
    ],
    [parcelProducts]
  );

  const table = useReactTable({
    data: editingRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading || isLoadingProducts) {
    return (
      <div className="bg-white rounded border p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p>Failed to load pricing assumptions</p>
      </div>
    );
  }

  // Empty state - only show if no parcel products exist
  if ((!editingRows || editingRows.length === 0) && (!parcelProducts || parcelProducts.length === 0)) {
    return (
      <div className="bg-white rounded border p-8 text-center">
        <div className="text-gray-600 mb-4">
          <p className="text-lg font-medium">No parcels configured</p>
          <p className="text-sm mt-2">Add parcels to the project first, then pricing will auto-populate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
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
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: 'var(--cui-border-color)' }}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
        {editingRows.length} pricing assumption(s)
      </div>
    </div>
  );
}
