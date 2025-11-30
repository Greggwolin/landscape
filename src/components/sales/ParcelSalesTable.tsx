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
import { CBadge, CTooltip } from '@coreui/react';
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
  calculateInflatedPriceFromPeriods,
  calculateNetProceeds,
  formatDateForAPI,
  parseISODate,
} from '@/lib/sales/calculations';
import type { SaveAssumptionsPayload, CreateBenchmarkPayload } from '@/types/sales-absorption';

interface Props {
  projectId: number;
  phaseFilters: number[];
  mode?: 'napkin' | 'standard' | 'detail';
}

// Use-type pill colors aligned with Parcel Detail table
const USE_TYPE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  // Blues
  SFD: { bg: '#1e3a8a', text: '#93c5fd' },   // blue-900 / blue-300
  VLDR: { bg: '#1e3a8a', text: '#93c5fd' },
  LDR: { bg: '#1e3a8a', text: '#93c5fd' },
  MLDR: { bg: '#1e3a8a', text: '#93c5fd' },
  MDR: { bg: '#1e3a8a', text: '#93c5fd' },
  RET: { bg: '#1e3a8a', text: '#93c5fd' },
  // Purples
  MX: { bg: '#581c87', text: '#d8b4fe' },    // purple-900 / purple-300
  MU: { bg: '#581c87', text: '#d8b4fe' },
  SFA: { bg: '#581c87', text: '#d8b4fe' },
  // Oranges
  MF: { bg: '#7c2d12', text: '#fdba74' },    // orange-900 / orange-300
  HDR: { bg: '#7c2d12', text: '#fdba74' },
  BTR: { bg: '#7c2d12', text: '#fdba74' },
  // Greens
  PARK: { bg: '#14532d', text: '#86efac' },  // green-900 / green-300
};

const getUseTypePillColors = (typeCode?: string | null) => {
  const key = (typeCode ?? '').toUpperCase();
  return USE_TYPE_PILL_COLORS[key] || { bg: '#312e81', text: '#a5b4fc' }; // indigo fallback
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

export default function ParcelSalesTable({ projectId, phaseFilters, mode = 'napkin' }: Props) {
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
  const [improvementOffset, setImprovementOffset] = useState<string>('');
  const [improvementOffsetDisplay, setImprovementOffsetDisplay] = useState<string>('');
  const [isSavingOffset, setIsSavingOffset] = useState<boolean>(false);
  const [improvementOffsetBenchmarkId, setImprovementOffsetBenchmarkId] = useState<number | null>(null);

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

  // Helper to format number with commas
  const formatNumberWithCommas = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Helper to remove commas from formatted string
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Fetch improvement offset on mount
  React.useEffect(() => {
    const fetchImprovementOffset = async () => {
      try {
        const url = `/api/projects/${projectId}/benchmarks?type=improvement_offset&scope=project`;
        console.log('Fetching improvement offset from:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched improvement offset data:', data);
          const benchmarks = data.benchmarks || data; // Handle both nested and direct array
          if (benchmarks && benchmarks.length > 0) {
            if (benchmarks[0].amount_per_uom != null) {
              const value = benchmarks[0].amount_per_uom.toString();
              setImprovementOffset(value);
              setImprovementOffsetDisplay(formatNumberWithCommas(value));
            }
            setImprovementOffsetBenchmarkId(benchmarks[0].benchmark_id);
            console.log('Set benchmark ID:', benchmarks[0].benchmark_id, 'value:', benchmarks[0].amount_per_uom);
          } else {
            console.log('No existing improvement offset found');
          }
        } else {
          console.error('Failed to fetch improvement offset, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch improvement offset:', error);
      }
    };
    fetchImprovementOffset();
  }, [projectId]);

  // Save improvement offset
  const handleSaveImprovementOffset = async () => {
    const value = parseFloat(improvementOffset);
    if (isNaN(value) && improvementOffset !== '') return;

    setIsSavingOffset(true);
    try {
      // If we have an existing benchmark, update it
      if (improvementOffsetBenchmarkId) {
        console.log('Updating existing benchmark:', improvementOffsetBenchmarkId, 'with value:', value);
        const response = await fetch(`/api/projects/${projectId}/benchmarks/${improvementOffsetBenchmarkId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount_per_uom: improvementOffset === '' ? null : value,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to update improvement offset:', errorData);
          throw new Error(errorData.error || 'Failed to update improvement offset');
        }

        const data = await response.json();
        console.log('Update response:', data);
      } else {
        // Create new benchmark
        console.log('Creating new benchmark with value:', value);
        const response = await fetch(`/api/projects/${projectId}/benchmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'SFD Improvement Offset',
            scope_level: 'project',
            project_id: parseInt(projectId),
            benchmark_type: 'improvement_offset',
            amount_per_uom: improvementOffset === '' ? null : value,
            uom_code: 'FF',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to create improvement offset:', errorData);
          throw new Error(errorData.error || 'Failed to create improvement offset');
        }

        // Store the new benchmark ID
        const data = await response.json();
        console.log('Create response:', data);
        if (data.benchmark_id) {
          setImprovementOffsetBenchmarkId(data.benchmark_id);
        }
      }

      // Trigger recalculation of all SFD parcels
      console.log('Triggering SFD parcel recalculation...');
      const recalcResponse = await fetch(`/api/projects/${projectId}/recalculate-sfd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (recalcResponse.ok) {
        const recalcData = await recalcResponse.json();
        console.log('Recalculation result:', recalcData);

        // Invalidate parcel sales data to refresh with new calculations
        queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });

        // Show success message with count
        setActionError(`✓ Improvement offset saved. ${recalcData.updated_count || 0} SFD parcels recalculated.`);
        setTimeout(() => setActionError(null), 5000);
      } else {
        console.error('Recalculation failed:', await recalcResponse.text());
        // Still invalidate to refresh
        queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
        setActionError('✓ Improvement offset saved. Refresh the page to see updated values.');
        setTimeout(() => setActionError(null), 5000);
      }
    } catch (error) {
      console.error('Failed to save improvement offset:', error);
      setActionError('Failed to save improvement offset');
    } finally {
      setIsSavingOffset(false);
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

      // Trigger automatic recalculation for this parcel's use type
      try {
        const recalcResponse = await fetch(
          `/api/projects/${projectId}/recalculate-sfd?type_code=${parcel.type_code}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (recalcResponse.ok) {
          // Invalidate queries to refresh the table with new net proceeds
          queryClient.invalidateQueries({ queryKey: ['parcels-with-sales', projectId] });
        }
      } catch (recalcError) {
        console.warn('Recalculation failed (sale saved successfully):', recalcError);
        // Don't block the save flow - proceed even if recalculation fails
      }

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
    () => {
      const baseColumns: ColumnDef<ParcelWithSale>[] = [
      {
        accessorKey: 'parcel_code',
        header: 'Parcel ID',
        size: 120,
        cell: ({ row }) => (
          <div className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>{row.original.parcel_code || `P-${row.original.parcel_id}`}</div>
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
          const { bg, text } = getUseTypePillColors(code);
          return (
            <div className="flex justify-center">
              <span
                className="px-2 py-1 rounded text-xs fw-semibold"
                style={{
                  backgroundColor: bg,
                  color: text,
                  letterSpacing: '0.01em',
                }}
              >
                {code || 'N/A'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'lot_product',
        header: 'Product',
        cell: ({ row }) => <div style={{ color: 'var(--cui-body-color)' }}>{row.original.lot_product || row.original.product_code || '-'}</div>,
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
        accessorKey: 'sale_period',
        header: () => <div className="text-center">Sale Period</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const parcel = row.original;
          return (
            <div className="text-center">
              <input
                type="number"
                value={parcel.sale_period ?? ''}
                className="border rounded px-2 py-1 text-sm text-center"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  color: 'var(--cui-body-color)',
                  width: '80px',
                }}
                placeholder="-"
                title="Absolute month index (e.g., month 26 = 2 years, 2 months)"
                readOnly
              />
            </div>
          );
        },
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
                readOnly
                className="border rounded px-2 py-1 text-sm"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  color: 'var(--cui-body-color)',
                  cursor: 'not-allowed',
                  opacity: 0.7,
                }}
                disabled={!hasQuantity || isSaving}
                title="Sale date is automatically calculated from Sale Period"
              />
              {isSaving && (
                <span className="text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>Saving...</span>
              )}
              {!hasQuantity && (
                <span className="text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>Configure {fieldName} first</span>
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
            return <div className="text-right text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>Configure pricing</div>;
          }

          // Calculate inflated price using sale_period (not dates) for accuracy
          let pricePerUnit = basePrice;
          let isInflated = false;

          if (parcel.sale_period && parcel.growth_rate) {
            // Use period-based calculation (matches Excel FV function exactly)
            pricePerUnit = calculateInflatedPriceFromPeriods(
              basePrice,
              parcel.growth_rate,
              parcel.sale_period
            );
            isInflated = parcel.growth_rate > 0;
          }

          // Format: Show cents for values < $100, otherwise show whole dollars with commas
          const shouldShowDecimals = pricePerUnit < 100;

          // Normalize UOM display (strip $/prefix if present)
          const displayUom = parcel.uom_code ? parcel.uom_code.replace('$/', '') : '';

          return (
            <div className="text-right">
              {formatMoney(pricePerUnit, {
                minimumFractionDigits: shouldShowDecimals ? 2 : 0,
                maximumFractionDigits: shouldShowDecimals ? 2 : 0
              })}
              {displayUom && <span className="text-xs ml-1" style={{ color: 'var(--cui-secondary-color)' }}>/{displayUom}</span>}
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
          const currentPrice = parcel.base_price_per_unit ?? parcel.current_value_per_unit;

          // If no pricing configured, show "-" with value of 0
          if (!currentPrice || currentPrice === 0) {
            return <div className="text-right" style={{ color: 'var(--cui-secondary-color)' }}>-</div>;
          }

          if (!saleDate) {
            return <div className="text-right italic" style={{ color: 'var(--cui-secondary-color)' }}>Pending</div>;
          }

          // If we have saved net proceeds from the backend (from the modal), use that
          if (parcel.net_proceeds != null) {
            const valueColor = parcel.net_proceeds < 0
              ? 'var(--cui-danger)'
              : parcel.net_proceeds > 1_000_000
              ? 'var(--cui-success)'
              : 'var(--cui-body-color)';

            return (
              <div className="text-right font-semibold" style={{ color: valueColor }}>
                {formatMoney(parcel.net_proceeds, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            );
          }

          // Otherwise, show placeholder indicating calculation needed
          return <div className="text-right italic text-sm" style={{ color: 'var(--cui-secondary-color)' }}>Calculate</div>;
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
              <CTooltip content="View detailed sale calculation" placement="top">
                <button
                  type="button"
                  className="px-3 py-1 text-sm border rounded flex items-center gap-1"
                  style={
                    hasCalculation
                      ? {
                          borderColor: 'var(--cui-primary)',
                          color: 'var(--cui-primary)',
                          backgroundColor: 'var(--cui-primary-bg)',
                        }
                      : {
                          borderColor: 'var(--cui-border-color)',
                          color: 'var(--cui-body-color)',
                        }
                  }
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
              </CTooltip>
            </div>
          );
        },
      },
    ];

    // Conditionally add growth rate column in Standard/Detail modes only
    if (mode === 'standard' || mode === 'detail') {
      // Insert growth rate column before the "Actions" column (which is last)
      baseColumns.splice(baseColumns.length - 1, 0, {
        accessorKey: 'growth_rate',
        header: () => (
          <div className="text-center">
            Growth<br />Rate
          </div>
        ),
        cell: ({ row }) => {
          const value = row.original.growth_rate;
          if (value == null) {
            return <div className="text-center text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>-</div>;
          }
          const percentage = (value * 100).toFixed(1);
          return (
            <div className="text-center text-sm tnum" style={{ color: 'var(--cui-body-color)' }}>
              {percentage}%
            </div>
          );
        },
      });
    }

    return baseColumns;
  },
    [pendingDates, savingParcelId, mode]
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
      <div className="p-4 rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <div className="animate-pulse space-y-3">
          <div className="h-8 rounded w-full" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }} />
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded" style={{ backgroundColor: 'var(--cui-danger-bg)', borderColor: 'var(--cui-danger)', color: 'var(--cui-danger)' }}>
        <p>Failed to load parcels data</p>
      </div>
    );
  }

  if (!parcels || parcels.length === 0) {
    return (
      <div className="p-4 border rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
        <p>No parcels found {phaseFilters.length > 0 ? 'for selected phases' : ''}</p>
      </div>
    );
  }

  let lastPhaseCode: string | null = null;

  return (
    <div className="rounded border overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      {actionError && (
        <div className="px-4 py-2 text-sm border-b" style={{ backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)', borderColor: 'var(--cui-danger)' }}>{actionError}</div>
      )}
      {/* Header bar with improvement offset input */}
      <div className="px-4 py-2 border-b flex justify-end items-center gap-2" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)' }}>
        <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--cui-body-color)' }}>
          Impr. Offset (SFD):
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm" style={{ color: 'var(--cui-body-color)' }}>$</span>
          <input
            type="text"
            value={improvementOffsetDisplay}
            onChange={(e) => {
              const rawValue = removeCommas(e.target.value);
              // Only allow numbers and decimal point
              if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                setImprovementOffset(rawValue);
                setImprovementOffsetDisplay(e.target.value);
              }
            }}
            onBlur={(e) => {
              // Format on blur
              const rawValue = removeCommas(e.target.value);
              if (rawValue !== '') {
                setImprovementOffsetDisplay(formatNumberWithCommas(rawValue));
              }
              handleSaveImprovementOffset();
            }}
            onFocus={(e) => {
              // Remove formatting on focus for easier editing
              setImprovementOffsetDisplay(improvementOffset);
            }}
            disabled={isSavingOffset}
            className="px-2 py-1 text-sm border rounded w-24 text-right"
            style={{
              borderColor: 'var(--cui-border-color)',
              backgroundColor: 'var(--cui-body-bg)',
              color: 'var(--cui-body-color)',
            }}
            placeholder="0.00"
          />
          <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>/FF</span>
        </div>
        {isSavingOffset && (
          <span className="text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>Saving...</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'var(--surface-subheader)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 font-medium"
                    style={{
                      width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                      color: 'var(--cui-body-color)',
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
                          className="text-xs flex-shrink-0"
                          style={{ color: 'var(--cui-primary)' }}
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
                    <tr className="border-t border-b" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)' }}>
                      <td colSpan={columns.length} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-body-color)' }}>
                        {parcel.sale_phase_code
                          ? `Sale Phase ${parcel.sale_phase_code}${phase?.sale_date ? ` (${formatSaleDate(phase.sale_date)})` : ''}`
                          : 'Ungrouped Parcels'}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-2 py-2 align-top" style={{ color: 'var(--cui-body-color)' }}>
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
      <div className="px-4 py-3 border-t text-sm" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
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
