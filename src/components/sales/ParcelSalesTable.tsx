/**
 * Parcel Sales Table
 * TanStack Table displaying parcels with sale information
 * Includes expandable rows for sale detail form
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from '@tanstack/react-table';
import { useParcelsWithSales } from '@/hooks/useSalesAbsorption';
import type { ParcelWithSale } from '@/types/sales-absorption';
import SaleDetailForm from './SaleDetailForm';
import { formatMoney, formatNumber } from '@/utils/formatters/number';

interface Props {
  projectId: number;
  phaseFilters: number[];
}

// Density color mapping (matches Planning page)
const DENSITY_COLORS: Record<string, string> = {
  VLDR: '#FFF9C4', // Light yellow
  LDR: '#FFF176',  // Yellow
  MDR: '#FFB74D',  // Orange
  HDR: '#EF5350',  // Red
  COM: '#42A5F5',  // Blue
  IND: '#AB47BC',  // Purple
};

export default function ParcelSalesTable({ projectId, phaseFilters }: Props) {
  const { data: parcels, isLoading, error } = useParcelsWithSales(projectId, phaseFilters);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<ParcelWithSale>[]>(
    () => [
      {
        accessorKey: 'parcel_code',
        header: 'Parcel ID',
        size: 100,
        cell: ({ row }) => (
          <div>
            {row.original.parcel_code || `P-${row.original.parcel_id}`}
          </div>
        ),
      },
      {
        accessorKey: 'type_code',
        header: () => (
          <div className="text-center">
            Use<br />Type
          </div>
        ),
        cell: ({ row }) => {
          const value = row.original.type_code;
          const familyName = row.original.family_name;

          // Match Planning page color scheme based on family_name
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
        accessorKey: 'lot_product',
        header: 'Product',
        cell: ({ getValue }) => (
          <div>{(getValue() as string) || '-'}</div>
        ),
      },
      {
        accessorKey: 'acres',
        header: () => <div className="text-center">Acres</div>,
        cell: ({ getValue }) => (
          <div className="text-center tnum">
            {formatNumber(getValue() as number, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        ),
      },
      {
        accessorKey: 'units',
        header: () => <div className="text-center">Units</div>,
        cell: ({ getValue }) => (
          <div className="text-center tnum">
            {formatNumber(getValue() as number)}
          </div>
        ),
      },
      {
        accessorKey: 'current_value_per_unit',
        header: () => (
          <div className="text-right">
            Value /<br />Unit
          </div>
        ),
        cell: ({ row }) => {
          const value = row.original.current_value_per_unit;
          const uom = row.original.uom_code;

          if (value === null || value === undefined) {
            return (
              <div className="text-right text-xs text-gray-400 italic">
                No pricing
              </div>
            );
          }

          return (
            <div className="text-right tnum">
              {formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {uom && <span className="text-gray-500 ml-1">/{uom}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'gross_value',
        header: () => (
          <div className="text-right">
            Gross<br />Value
          </div>
        ),
        cell: ({ getValue }) => {
          const value = getValue() as number | null;

          if (value === null || value === undefined) {
            return (
              <div className="text-right text-xs text-gray-400 italic">
                No pricing
              </div>
            );
          }

          return (
            <div className="text-right tnum font-medium">
              {formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        id: 'sale_status',
        header: () => <div className="text-center">Status</div>,
        cell: ({ row }) => {
          const sale = row.original.sale_event;
          if (!sale) {
            return (
              <div className="text-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Available
                </span>
              </div>
            );
          }

          const statusColors: Record<string, { bg: string; text: string }> = {
            pending: { bg: '#FFF9C4', text: '#F57F17' },
            active: { bg: '#C8E6C9', text: '#2E7D32' },
            closed: { bg: '#BBDEFB', text: '#1565C0' },
            terminated: { bg: '#FFCDD2', text: '#C62828' },
          };

          const colors = statusColors[sale.sale_status] || statusColors.pending;

          return (
            <div className="text-center">
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {sale.sale_status}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={() => {
              setExpanded((prev) => ({
                ...prev,
                [row.id]: !prev[row.id],
              }));
            }}
          >
            {row.getIsExpanded() ? '▼ Hide' : '► Details'}
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: parcels || [],
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded border">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p>Failed to load parcels data</p>
      </div>
    );
  }

  if (!parcels || parcels.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
        <p>No parcels found {phaseFilters.length > 0 ? 'for selected phases' : ''}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 font-medium cursor-pointer"
                    style={{
                      color: 'var(--cui-body-color)',
                      width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <span style={{ color: 'var(--cui-primary, #0d6efd)' }}>
                        {' '}{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                {/* Main row */}
                <tr className="border-b transition-colors" style={{ borderColor: 'var(--cui-border-color)' }}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>

                {/* Expanded row with form */}
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-4 bg-gray-50">
                      <SaleDetailForm
                        projectId={projectId}
                        parcel={row.original}
                        onCancel={() => {
                          setExpanded((prev) => ({
                            ...prev,
                            [row.id]: false,
                          }));
                        }}
                        onSave={() => {
                          setExpanded((prev) => ({
                            ...prev,
                            [row.id]: false,
                          }));
                        }}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
        Showing {table.getRowModel().rows.length} parcel(s)
      </div>
    </div>
  );
}
