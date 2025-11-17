/**
 * Parcel Sales Table
 * Implements Sale Phase grouping, benchmark inheritance, and detail overrides
 */

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingFn,
  type SortingState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Select, MenuItem, Tooltip, CircularProgress } from '@mui/material';
import { CBadge } from '@coreui/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAssignParcelToPhase,
  useCreateSalePhase,
  useCreateParcelSale,
  useParcelsWithSales,
  useUpdateParcelSaleDate,
} from '@/hooks/useSalesAbsorption';
import type {
  ParcelWithSale,
  SalePhaseSummary,
  SalePhaseBenchmarks,
  ParcelSalesDataset,
  CreateSalePhasePayload,
} from '@/types/sales-absorption';
import CreateSalePhaseModal from './CreateSalePhaseModal';
import SaleCalculationModal from './SaleCalculationModal';
import { formatMoney, formatNumber } from '@/utils/formatters/number';
import { calculateGrossValue, calculateInflatedValue } from '@/utils/sales/calculations';
import {
  calculateInflatedPrice,
  calculateNetProceeds,
  formatDateForAPI,
  parseISODate,
} from '@/lib/sales/calculations';
import type { SaveAssumptionsPayload, CreateBenchmarkPayload } from '@/types/sales-absorption';

interface Props {
  projectId: number;
  phaseFilters: number[];
}

// Use semantic chip colors that work in light and dark modes
const USE_TYPE_CHIP_COLORS: Record<string, string> = {
  VLDR: 'success',   // Very Low Density Residential - green
  LDR: 'success',    // Low Density Residential - green
  MDR: 'warning',    // Medium Density Residential - yellow
  HDR: 'danger',     // High Density Residential - red
  COM: 'info',       // Commercial - blue
  IND: 'secondary',  // Industrial - gray
};

const CREATE_NEW_PHASE_VALUE = '__create__';
const CLEAR_PHASE_VALUE = '__none__';

const salePhaseSort: SortingFn<ParcelWithSale> = (rowA, rowB) => {
  const phaseA = rowA.original.sale_phase_code;
  const phaseB = rowB.original.sale_phase_code;

  if (!phaseA && !phaseB) return 0;
  if (!phaseA) return 1; // ungrouped go to the bottom
  if (!phaseB) return -1;
  return phaseA.localeCompare(phaseB);
};

function formatSaleDate(value?: string | null) {
  if (!value) return 'Pending';
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch (error) {
    return value;
  }
}

function applyCalculatedPricing(parcel: ParcelWithSale): ParcelWithSale {
  const saleDate = parcel.sale_date || parcel.sale_event?.contract_date || null;
  const inflatedValue = calculateInflatedValue(
    parcel.base_price_per_unit ?? parcel.current_value_per_unit,
    parcel.growth_rate,
    parcel.pricing_effective_date,
    saleDate
  );

  const grossValue = calculateGrossValue(parcel.units, inflatedValue ?? parcel.current_value_per_unit);

  return {
    ...parcel,
    current_value_per_unit: inflatedValue ?? parcel.current_value_per_unit,
    gross_value: grossValue ?? parcel.gross_value ?? null,
  };
}

export default function ParcelSalesTable({ projectId, phaseFilters }: Props) {
  const { data, isLoading, error } = useParcelsWithSales(projectId, phaseFilters);
  const queryClient = useQueryClient();
  const assignPhase = useAssignParcelToPhase(projectId);
  const createPhase = useCreateSalePhase(projectId);
  const updateSaleDate = useUpdateParcelSaleDate(projectId);
  const createParcelSale = useCreateParcelSale(projectId);

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'parcel_code', desc: false },
  ]);
  const [pendingDates, setPendingDates] = useState<Record<number, string>>({});
  const [phaseActionParcelId, setPhaseActionParcelId] = useState<number | null>(null);
  const [dateUpdatingParcelId, setDateUpdatingParcelId] = useState<number | null>(null);
  const [phaseModalParcel, setPhaseModalParcel] = useState<ParcelWithSale | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingParcelId, setSavingParcelId] = useState<number | null>(null);
  const [calculationModalParcel, setCalculationModalParcel] = useState<ParcelWithSale | null>(null);
  const [isSavingCalculation, setIsSavingCalculation] = useState<boolean>(false);

  const dataset: ParcelSalesDataset | undefined = data;
  const salePhases = dataset?.sale_phases ?? [];
  const benchmarkDefaults = dataset?.benchmark_defaults;

  const phaseLookup = useMemo(() => {
    return new Map<string, SalePhaseSummary>(salePhases.map((phase) => [phase.phase_code, phase]));
  }, [salePhases]);

  const parcels = useMemo(() => {
    if (!dataset?.parcels) return [];
    return dataset.parcels.map((parcel) => applyCalculatedPricing(parcel));
  }, [dataset]);

  // Check if multiple phases exist in current dataset
  const hasMultiplePhases = useMemo(() => {
    const uniquePhases = new Set(parcels.map(p => p.sale_phase_code || 'ungrouped'));
    return uniquePhases.size > 1;
  }, [parcels]);

  const handlePhaseSelection = useCallback(
    async (parcel: ParcelWithSale, value: string) => {
      if (value === CREATE_NEW_PHASE_VALUE) {
        setPhaseModalParcel(parcel);
        return;
      }

      const nextValue = value === CLEAR_PHASE_VALUE ? null : value;
      if (nextValue === parcel.sale_phase_code) return;

      try {
        setActionError(null);
        setPhaseActionParcelId(parcel.parcel_id);
        await assignPhase.mutateAsync({ parcel_id: parcel.parcel_id, sale_phase_code: nextValue });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update sale phase';
        setActionError(message);
      } finally {
        setPhaseActionParcelId(null);
      }
    },
    [assignPhase]
  );

  const handleLocalSaleDateChange = (parcelId: number, value: string) => {
    setPendingDates((prev) => ({
      ...prev,
      [parcelId]: value
    }));
  };

  const handleSaleDateCommit = async (parcel: ParcelWithSale) => {
    const pendingValue = pendingDates[parcel.parcel_id];
    if (pendingValue === undefined) return;

    try {
      setActionError(null);
      setDateUpdatingParcelId(parcel.parcel_id);
      await updateSaleDate.mutateAsync({ parcel_id: parcel.parcel_id, sale_date: pendingValue || null });
      setPendingDates((prev) => {
        const next = { ...prev };
        delete next[parcel.parcel_id];
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update sale date';
      setActionError(message);
    } finally {
      setDateUpdatingParcelId(null);
    }
  };

  const handleCreatePhase = async (payload: CreateSalePhasePayload) => {
    try {
      setActionError(null);
      await createPhase.mutateAsync(payload);
      setPhaseModalParcel(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create sale phase';
      setActionError(message);
    }
  };

  const handleSaveCalculation = async (payload: SaveAssumptionsPayload) => {
    if (!calculationModalParcel) return;

    try {
      setIsSavingCalculation(true);
      setActionError(null);

      const response = await fetch(
        `/api/projects/${projectId}/parcels/${calculationModalParcel.parcel_id}/sale-assumptions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save sale calculation');
      }

      // Invalidate and refetch the parcels data
      await queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });

      setCalculationModalParcel(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save sale calculation';
      setActionError(message);
      throw err; // Re-throw so modal can handle it
    } finally {
      setIsSavingCalculation(false);
    }
  };

  const handleCreateBenchmark = async (payload: CreateBenchmarkPayload) => {
    try {
      setActionError(null);

      const response = await fetch(`/api/projects/${projectId}/sale-benchmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create benchmark');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create benchmark';
      setActionError(message);
      throw err; // Re-throw so modal can handle it
    }
  };

  const handleSaveSale = async (parcel: ParcelWithSale) => {
    const saleDate = pendingDates[parcel.parcel_id];
    if (!saleDate) {
      setActionError('Sale date is required');
      return;
    }

    // Determine quantity based on land use type
    // Residential uses units, everything else uses acres
    const isResidential = ['SFD', 'SFA', 'MF', 'VLDR'].includes(parcel.type_code);
    const quantity = isResidential ? parcel.units : parcel.acres;

    // Validate quantity
    if (!quantity || quantity <= 0) {
      const fieldName = isResidential ? 'units' : 'acres';
      setActionError(`Cannot save: Parcel ${parcel.parcel_code || parcel.parcel_id} has no ${fieldName} configured`);
      return;
    }

    try {
      setActionError(null);
      setSavingParcelId(parcel.parcel_id);

      const payload = {
        parcel_id: parcel.parcel_id,
        sale_type: 'single_closing',
        closings: [
          {
            closing_number: 1,
            closing_date: saleDate,
            units_closing: quantity,
          },
        ],
      };

      // Create single closing sale with quantity
      await createParcelSale.mutateAsync(payload);

      // Clear pending date after successful save
      setPendingDates((prev) => {
        const next = { ...prev };
        delete next[parcel.parcel_id];
        return next;
      });
    } catch (err) {
      // Extract error message from various error formats
      let message = 'Failed to save sale';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle structured error objects (e.g., from React Query)
        const errorObj = err as any;
        message = errorObj.message || errorObj.error || JSON.stringify(err);
      } else if (typeof err === 'string') {
        message = err;
      }
      setActionError(message);
    } finally {
      setSavingParcelId(null);
    }
  };

  const columns = useMemo<ColumnDef<ParcelWithSale>[]>(
    () => [
      {
        accessorKey: 'parcel_code',
        header: 'Parcel ID',
        size: 120,
        cell: ({ row }) => (
          <div className="font-semibold text-gray-800">{row.original.parcel_code || `P-${row.original.parcel_id}`}</div>
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
          const code = row.original.type_code;
          const chipColor = USE_TYPE_CHIP_COLORS[code] || 'secondary';
          return (
            <div className="flex justify-center">
              <CBadge color={chipColor} className="font-semibold text-xs">
                {code || 'N/A'}
              </CBadge>
            </div>
          );
        },
      },
      {
        accessorKey: 'lot_product',
        header: 'Product',
        cell: ({ row }) => <div className="text-gray-800">{row.original.lot_product || row.original.product_code || '-'}</div>,
      },
      {
        accessorKey: 'acres',
        header: () => <div className="text-right">Acres</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {formatNumber(row.original.acres, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'units',
        header: () => <div className="text-center">Units</div>,
        cell: ({ row }) => (
          <div className="text-center">{formatNumber(row.original.units)}</div>
        ),
      },
      {
        accessorKey: 'sale_date',
        header: () => <div className="text-right">Sale Date</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const parcel = row.original;
          const value = pendingDates[parcel.parcel_id] ?? parcel.sale_date ?? '';
          const hasPendingChange = pendingDates[parcel.parcel_id] !== undefined;
          const isSaving = savingParcelId === parcel.parcel_id;

          // Determine which quantity field to check based on land use type
          const isResidential = ['SFD', 'SFA', 'MF', 'VLDR'].includes(parcel.type_code);
          const quantity = isResidential ? parcel.units : parcel.acres;
          const hasQuantity = quantity && quantity > 0;
          const fieldName = isResidential ? 'units' : 'acres';

          const handleDateChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
            const newDate = event.target.value;
            handleLocalSaleDateChange(parcel.parcel_id, newDate);

            // Auto-save after a short delay
            if (hasQuantity && newDate) {
              setTimeout(async () => {
                await handleSaveSale(parcel);
              }, 500);
            }
          };

          return (
            <div className="flex items-center justify-end gap-2">
              <input
                type="date"
                value={value}
                onChange={handleDateChange}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                disabled={!hasQuantity || isSaving}
                title={!hasQuantity ? `Configure ${fieldName} on Planning page first` : ''}
              />
              {isSaving && (
                <span className="text-xs text-gray-500 italic">Saving...</span>
              )}
              {!hasQuantity && (
                <span className="text-xs text-gray-500 italic">Configure {fieldName} first</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'current_value_per_unit',
        header: () => (
          <div className="text-right">
            Value /<br />Unit
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const parcel = row.original;
          const basePrice = parcel.base_price_per_unit ?? parcel.current_value_per_unit;

          if (basePrice == null) {
            return <div className="text-right text-xs text-gray-400 italic">Configure pricing</div>;
          }

          // Calculate inflated price if sale date exists
          const saleDate = pendingDates[parcel.parcel_id] ?? parcel.sale_date;
          let pricePerUnit = basePrice;

          if (saleDate && parcel.pricing_effective_date && parcel.growth_rate) {
            pricePerUnit = calculateInflatedPrice(
              basePrice,
              parcel.growth_rate,
              parseISODate(parcel.pricing_effective_date),
              parseISODate(saleDate)
            );
          }

          // Format: no decimals for FF (Front Foot), decimals for SF (Square Foot)
          const shouldShowDecimals = parcel.uom_code === 'SF';

          return (
            <div className="text-right">
              {formatMoney(pricePerUnit, {
                minimumFractionDigits: shouldShowDecimals ? 2 : 0,
                maximumFractionDigits: shouldShowDecimals ? 2 : 0
              })}
              {parcel.uom_code && <span className="text-xs text-gray-500 ml-1">/{parcel.uom_code}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'net_proceeds',
        header: () => (
          <div className="text-right">
            Net<br />Proceeds
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const parcel = row.original;
          const saleDate = pendingDates[parcel.parcel_id] ?? parcel.sale_date;

          if (!saleDate) {
            return <div className="text-right italic text-gray-400">Pending</div>;
          }

          // If we have saved net proceeds from the backend (from the modal), use that
          if (parcel.net_proceeds != null) {
            const valueClass = parcel.net_proceeds < 0
              ? 'text-red-600'
              : parcel.net_proceeds > 1_000_000
              ? 'text-green-700'
              : 'text-gray-900';

            return (
              <div className={`text-right font-semibold ${valueClass}`}>
                {formatMoney(parcel.net_proceeds, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            );
          }

          // Otherwise, show placeholder indicating calculation needed
          return <div className="text-right text-gray-400 italic text-sm">Calculate</div>;
        },
      },
      {
        id: 'detail',
        header: () => <div className="text-center">Detail</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const parcel = row.original;
          const saleDate = pendingDates[parcel.parcel_id] ?? parcel.sale_date;
          const hasCalculation = Boolean(parcel.net_proceeds);

          return (
            <div className="flex justify-center">
              <Tooltip title="View detailed sale calculation">
                <button
                  type="button"
                  className={`px-3 py-1 text-sm border rounded flex items-center gap-1 ${
                    hasCalculation ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700'
                  }`}
                  onClick={() => {
                    // Clear any previous errors
                    setActionError(null);
                    // Create a parcel object with the current sale_date (including pending changes)
                    const parcelWithDate: ParcelWithSale = {
                      ...parcel,
                      sale_date: saleDate || null,
                    };
                    setCalculationModalParcel(parcelWithDate);
                  }}
                  disabled={!saleDate}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Detail
                </button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [pendingDates, savingParcelId]
  );

  const table = useReactTable({
    data: parcels,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded border">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-full" />
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 bg-gray-100 rounded" />
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

  let lastPhaseCode: string | null = null;

  return (
    <div className="bg-white rounded border overflow-hidden">
      {actionError && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">{actionError}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 font-medium text-gray-700"
                    style={{
                      width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1 w-full">
                      <div className="flex-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                      {header.column.getCanSort() && (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="text-xs text-blue-600 flex-shrink-0"
                        >
                          {header.column.getIsSorted() === 'asc'
                            ? '↑'
                            : header.column.getIsSorted() === 'desc'
                            ? '↓'
                            : '↕︎'}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const parcel = row.original;
              const phaseCode = parcel.sale_phase_code || 'ungrouped';
              const showHeader = phaseCode !== lastPhaseCode;
              if (showHeader) {
                lastPhaseCode = phaseCode;
              }

              const phase = phaseLookup.get(parcel.sale_phase_code || '');

              return (
                <React.Fragment key={row.id}>
                  {showHeader && hasMultiplePhases && (
                    <tr className="bg-gray-100 border-t border-b border-gray-200">
                      <td colSpan={columns.length} className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {parcel.sale_phase_code
                          ? `Sale Phase ${parcel.sale_phase_code}${phase?.sale_date ? ` (${formatSaleDate(phase.sale_date)})` : ''}`
                          : 'Ungrouped Parcels'}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-2 py-2 align-top text-gray-800">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
        Showing {table.getRowModel().rows.length} parcel(s)
      </div>

      <CreateSalePhaseModal
        open={Boolean(phaseModalParcel)}
        parcel={phaseModalParcel}
        defaultBenchmarks={benchmarkDefaults}
        onClose={() => setPhaseModalParcel(null)}
        onSubmit={(payload) => handleCreatePhase(payload)}
        isSaving={createPhase.isPending}
      />

      <SaleCalculationModal
        open={Boolean(calculationModalParcel)}
        parcel={calculationModalParcel}
        projectId={projectId}
        onClose={() => setCalculationModalParcel(null)}
        onSave={handleSaveCalculation}
        onCreateBenchmark={handleCreateBenchmark}
        isSaving={isSavingCalculation}
      />
    </div>
  );
}
