/**
 * ComparablesGrid Component
 *
 * Displays all sales comparables in a horizontal table format
 * and an accordion-style adjustments grid with one input column per comparable.
 */

'use client';

import React, { useState, useCallback } from 'react';
import type {
  SalesComparable,
  SalesCompAdjustment,
  SalesComparableForm
} from '@/types/valuation';
import { AdjustmentCell } from './AdjustmentCell';
import { updateSalesComparable, updateUserAdjustment } from '@/lib/api/valuation';
import { LandscapeButton } from '@/components/ui/landscape';

interface ComparablesGridProps {
  comparables: SalesComparable[];
  projectId: number;
  onEdit?: (comp: SalesComparable) => void;
  onDelete?: (compId: number) => Promise<void>;
  onRefresh?: () => void;
  onAddComp?: () => void;
  mode?: 'multifamily' | 'land'; // Field label mode: multifamily (default) or land sales
}

type AdjustmentSectionKey = 'transaction' | 'property';

const ADJUSTMENT_SECTIONS: {
  key: AdjustmentSectionKey;
  label: string;
  adjustments: { type: string; label: string; indent: number }[];
}[] = [
  {
    key: 'transaction',
    label: 'Transaction',
    adjustments: [
      { type: 'property_rights', label: 'Property Rights', indent: 1 },
      { type: 'financing', label: 'Financing', indent: 1 },
      { type: 'conditions_of_sale', label: 'Conditions of Sale', indent: 1 },
      { type: 'market_conditions', label: 'Market Conditions', indent: 1 },
      { type: 'other', label: 'Other', indent: 1 },
    ]
  },
  {
    key: 'property',
    label: 'Property',
    adjustments: [
      { type: 'location', label: 'Location', indent: 2 },
      { type: 'physical_condition', label: 'Age / Condition', indent: 2 },
      { type: 'economic', label: 'Economic', indent: 2 },
      { type: 'deferred_maintenance', label: 'Deferred Maint', indent: 2 },
      { type: 'other', label: 'Other', indent: 2 },
    ]
  }
];

export function ComparablesGrid({ comparables, projectId, onEdit, onDelete, onRefresh, onAddComp, mode = 'multifamily' }: ComparablesGridProps) {
  const [openSections, setOpenSections] = useState<Record<AdjustmentSectionKey, boolean>>({
    transaction: true,
    property: true
  });
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<{ compId: number; comp: SalesComparable } | null>(null);
  const [pendingValues, setPendingValues] = useState<Record<number, Record<string, string>>>({});
  type ComparableField =
    | 'city'
    | 'sale_date'
    | 'sale_price'
    | 'price_per_unit'
    | 'price_per_sf'
    | 'units'
    | 'building_sf'
    | 'cap_rate'
    | 'year_built';
  // Field label mapping based on mode
  const getFieldLabel = (field: string): string => {
    if (mode === 'land') {
      const landMapping: Record<string, string> = {
        'Price/Unit': 'Price/Acre',
        'Price/SF': 'Price/Front Foot',
        'Units': 'Acres',
        'Building SF': 'Zoning',
        'Cap Rate': 'Entitlements',
        'Year Built': 'Utilities',
      };
      return landMapping[field] || field;
    }
    return field;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const formatSalePriceValue = (value: number | null | undefined) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (Math.abs(num) >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(num) >= 1_000) {
      return `$${(num / 1_000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatPricePerUnitValue = (value: number | null | undefined) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (Math.abs(num) >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(num) >= 1_000) {
      return `$${Math.round(num / 1_000)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatPricePerSquareFootValue = (value: number | null | undefined) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return `${Math.round(num)}`;
  };

  const formatNumberWithCommas = (value: number | null | undefined) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return Math.round(num).toLocaleString();
  };

  const formatYearValue = (value: number | null | undefined) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return Math.round(num).toString();
  };

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit'
  });

  const formatDateLabel = (value: string | null | undefined) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const parts = dateFormatter.formatToParts(parsed);
    const month = parts.find(part => part.type === 'month')?.value ?? '';
    const year = parts.find(part => part.type === 'year')?.value ?? '';
    return month && year ? `${month}-${year}` : `${month}${year}`;
  };

  // Get current adjustment for a specific comparable and adjustment type
  const getCurrentAdjustment = (comp: SalesComparable, adjType: string): SalesCompAdjustment | null => {
    return comp.adjustments?.find(a => a.adjustment_type === adjType) || null;
  };

  const setPendingFieldValue = (compId: number, field: string, value: string) => {
    setPendingValues(prev => ({
      ...prev,
      [compId]: {
        ...prev[compId],
        [field]: value
      }
    }));
  };

  const clearPendingField = (compId: number, field: string) => {
    setPendingValues(prev => {
      const compValues = { ...prev[compId] };
      delete compValues[field];
      if (Object.keys(compValues).length === 0) {
        const next = { ...prev };
        delete next[compId];
        return next;
      }
      return {
        ...prev,
        [compId]: compValues
      };
    });
  };

  const getPendingFieldValue = (compId: number, field: string): string | undefined => {
    return pendingValues[compId]?.[field];
  };

  const getFieldDisplayValue = (comp: SalesComparable, field: ComparableField): string => {
    const pending = getPendingFieldValue(comp.comparable_id, field);
    if (pending !== undefined) return pending;

    switch (field) {
      case 'city':
        return comp.city || '';
      case 'sale_date':
        return formatDateLabel(comp.sale_date);
      case 'sale_price':
        return formatSalePriceValue(comp.sale_price);
      case 'price_per_unit':
        return formatPricePerUnitValue(comp.price_per_unit);
      case 'price_per_sf':
        return formatPricePerSquareFootValue(comp.price_per_sf);
      case 'units':
        return formatNumberWithCommas(comp.units);
      case 'building_sf':
        return formatNumberWithCommas(
          comp.building_sf != null ? Number(comp.building_sf) : null
        );
      case 'cap_rate':
        return formatDecimalPercentage(comp.cap_rate);
      case 'year_built':
        return formatYearValue(comp.year_built);
      default:
        return '';
    }
  };
  const getFieldActualValue = (comp: SalesComparable, field: ComparableField): string | number | null => {
    switch (field) {
      case 'city':
        return comp.city || null;
      case 'sale_date':
        return comp.sale_date || null;
      case 'sale_price':
        return comp.sale_price ?? null;
      case 'price_per_unit':
        return comp.price_per_unit ?? null;
      case 'price_per_sf':
        return comp.price_per_sf ?? null;
      case 'units':
        return comp.units ?? null;
      case 'building_sf':
        return comp.building_sf != null ? comp.building_sf : null;
      case 'cap_rate':
        return comp.cap_rate != null ? Number(comp.cap_rate) : null;
      case 'year_built':
        return comp.year_built ?? null;
      default:
        return null;
    }
  };

  const parseFieldValue = (
    field: ComparableField,
    rawValue: string
  ): string | number | null | undefined => {
    const trimmed = rawValue.trim();
    if (trimmed === '') {
      return null;
    }

    switch (field) {
      case 'city':
        return trimmed;
      case 'sale_date':
        return trimmed;
      case 'sale_price':
      case 'price_per_unit':
      case 'price_per_sf': {
        const num = parseFloat(trimmed.replace(/[^0-9.\-]/g, ''));
        return Number.isNaN(num) ? undefined : num;
      }
      case 'units': {
        const num = parseFloat(trimmed.replace(/[^0-9.\-]/g, ''));
        return Number.isNaN(num) ? undefined : num;
      }
      case 'building_sf':
        return trimmed;
      case 'cap_rate': {
        const num = parseFloat(trimmed.replace(/[^0-9.\-]/g, ''));
        return Number.isNaN(num) ? undefined : num / 100;
      }
      case 'year_built': {
        const num = parseInt(trimmed, 10);
        return Number.isNaN(num) ? undefined : num;
      }
      default:
        return null;
    }
  };

  const handleComparableFieldCommit = useCallback(async (
    comp: SalesComparable,
    field: ComparableField,
    rawValue: string
  ) => {
    const parsed = parseFieldValue(field, rawValue);
    if (parsed === undefined) {
      console.warn(`Invalid value for ${field}:`, rawValue);
      return;
    }

    const actual = getFieldActualValue(comp, field);

    const shouldSkip =
      (parsed === null && actual === null) ||
      (typeof parsed === 'string' && actual === parsed) ||
      (typeof parsed === 'number' && typeof actual === 'number' && Number(actual) === Number(parsed));

    if (shouldSkip) {
      clearPendingField(comp.comparable_id, field);
      return;
    }

    const payload: Partial<SalesComparableForm> = {
      project_id: comp.project_id,
      [field]: parsed as any
    };

    try {
      await updateSalesComparable(comp.comparable_id, payload);
      clearPendingField(comp.comparable_id, field);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update comparable field', field, error);
    }
  }, [onRefresh]);

  const formatDecimalPercentage = (value: number | null | undefined) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return `${(num * 100).toFixed(1)}%`;
  };

  const getRawFieldValue = (comp: SalesComparable, field: ComparableField): string => {
    switch (field) {
      case 'city':
        return comp.city || '';
      case 'sale_date':
        return comp.sale_date || '';
      case 'sale_price':
        return comp.sale_price != null ? Number(comp.sale_price).toFixed(2) : '';
      case 'price_per_unit':
        return comp.price_per_unit != null ? Number(comp.price_per_unit).toFixed(2) : '';
      case 'price_per_sf':
        return comp.price_per_sf != null ? Number(comp.price_per_sf).toFixed(2) : '';
      case 'units':
        return comp.units != null ? comp.units.toString() : '';
      case 'building_sf':
        return comp.building_sf != null ? Number(comp.building_sf).toFixed(0) : '';
      case 'cap_rate':
        return comp.cap_rate != null ? (Number(comp.cap_rate) * 100).toFixed(1) : '';
      case 'year_built':
        return comp.year_built != null ? comp.year_built.toString() : '';
      default:
        return '';
    }
  };

  const renderEditableInput = (
    comp: SalesComparable,
    field: ComparableField,
    options: {
      type?: 'text' | 'number' | 'date';
      step?: string;
      inputMode?: 'numeric' | 'decimal' | 'text';
      placeholder?: string;
    } = {}
  ) => {
    const { type = 'text', step, inputMode, placeholder } = options;
    return (
      <input
        type={type}
        inputMode={inputMode}
        step={step}
        value={getFieldDisplayValue(comp, field)}
        placeholder={placeholder}
        className="w-full px-1 py-0 text-center border-0 rounded-none bg-transparent focus:border-0 focus:outline-none"
        style={{
          color: 'var(--cui-body-color)',
          outline: 'none',
          boxShadow: 'none',
          border: 'none',
          borderWidth: 0,
          borderRadius: 0,
          backgroundColor: 'transparent',
          fontSize: '13px',
          lineHeight: '1.2',
          height: '18px'
        }}
        onChange={(event) => {
          setPendingFieldValue(comp.comparable_id, field, event.target.value);
        }}
        onFocus={() => {
          setPendingFieldValue(comp.comparable_id, field, getRawFieldValue(comp, field));
        }}
        onBlur={(event) => {
          handleComparableFieldCommit(comp, field, event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            handleComparableFieldCommit(comp, field, (event.target as HTMLInputElement).value);
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    );
  };

  // Handle manual changes to the Final column
  const handleFinalChange = useCallback(async (compId: number, adjType: string, value: number | null) => {
    try {
      const comparable = comparables.find(c => c.comparable_id === compId);
      const adjustment = comparable?.adjustments?.find(a => a.adjustment_type === adjType);

      if (!adjustment) {
        console.warn('No adjustment found to update');
        return;
      }

      // Update the user adjustment value
      await updateUserAdjustment(adjustment.adjustment_id, {
        user_adjustment_pct: value,
        ai_accepted: false // Manual override
      });

      // Refresh data
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update user adjustment:', error);
    }
  }, [comparables, onRefresh]);

  // Toggle edit mode
  const handleEditToggle = (compId: number) => {
    setEditingCompId(editingCompId === compId ? null : compId);
  };

  // Handle delete click - open confirmation modal
  const handleDeleteClick = (compId: number) => {
    const comp = comparables.find(c => c.comparable_id === compId);
    if (comp) {
      setDeleteModalOpen({ compId, comp });
    }
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!deleteModalOpen) return;

    try {
      if (onDelete) {
        await onDelete(deleteModalOpen.compId);
      }
      setDeleteModalOpen(null);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting comparable:', error);
      alert(`Error deleting comparable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const adjustmentsCollapsed = !openSections.transaction && !openSections.property;

  const formatTotalAdjustment = (value: number | null | undefined) => {
    if (value == null) return '';
    const pct = value * 100;
    if (!Number.isFinite(pct)) return '';
    const formatted = pct.toFixed(0);
    return `${pct > 0 ? '+' : ''}${formatted}%`;
  };

  const toggleSection = (sectionKey: AdjustmentSectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Render adjustment row helper
  const renderAdjustmentRow = (
    sectionKey: AdjustmentSectionKey,
    adjType: string,
    label: string,
    indentLevel: number
  ) => {
    const paddingLeft = 16 + indentLevel * 12;
    return (
      <tr key={`${sectionKey}-${adjType}`} className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
        <td
          className="py-1 px-4 font-medium sticky left-0 z-10"
          style={{
            color: 'var(--cui-secondary-color)',
            backgroundColor: 'var(--cui-card-bg)',
            paddingLeft: `${paddingLeft}px`
          }}
        >
          {label}
        </td>
        {comparables.map(comp => (
          <AdjustmentCell
            key={`${sectionKey}-${adjType}-${comp.comparable_id}`}
            comparableId={comp.comparable_id}
            adjustmentType={adjType}
            currentAdjustment={getCurrentAdjustment(comp, adjType)}
            onFinalChange={handleFinalChange}
          />
        ))}
      </tr>
    );
  };

  return (
    <>
      <div className="space-y-4 comparables-grid">
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setDeleteModalOpen(null)}
          />

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] rounded-lg shadow-2xl z-50"
            style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                borderColor: 'var(--cui-border-color)'
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                Delete Comparable?
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="mb-4" style={{ color: 'var(--cui-body-color)' }}>
                You're about to remove <strong>{deleteModalOpen.comp.property_name}</strong> from your analysis.
              </p>

              {/* AI Analysis */}
              <div
                className="p-4 rounded mb-4"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <div className="font-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>
                      AI Analysis
                    </div>
                    <div className="text-sm" style={{ color: 'var(--cui-body-color)', lineHeight: '1.6' }}>
                      {(() => {
                        const comp = deleteModalOpen.comp;
                        const totalAdj = Math.abs(comp.total_adjustment_pct * 100);

                        // AI decision logic
                        if (totalAdj > 25) {
                          return (
                            <>
                              <p className="mb-2">
                                <strong>You're right, this objectively isn't a good comp.</strong> This property requires <strong>{totalAdj.toFixed(0)}%</strong> in total adjustments, which exceeds the 25% threshold for reliable comparability.
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                Removing it will improve the reliability of your indicated value calculation.
                              </p>
                            </>
                          );
                        } else if (totalAdj > 15) {
                          return (
                            <>
                              <p className="mb-2">
                                This comparable requires <strong>{totalAdj.toFixed(0)}%</strong> in adjustments, which is moderate but still within acceptable range. Consider whether the specific characteristics justify removal.
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                I'll note your reasoning to improve future comparable selection.
                              </p>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <p className="mb-2">
                                This is actually a <strong>good comparable</strong> - it only requires <strong>{totalAdj.toFixed(0)}%</strong> in total adjustments. Are you sure you want to remove it?
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                I'll learn from your decision to better understand subtle comparability factors.
                              </p>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="text-xs p-3 rounded"
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: 'var(--cui-body-color)'
                }}
              >
                <strong>Note:</strong> This comparable will be retained in my persistent knowledge along with metadata about why it wasn't suitable, helping me learn more nuanced comparative analysis for future projects.
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{ borderColor: 'var(--cui-border-color)' }}
            >
              <LandscapeButton
                color="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(null)}
              >
                Cancel
              </LandscapeButton>
              <LandscapeButton
                color="danger"
                size="sm"
                onClick={handleConfirmDelete}
              >
                Delete Comparable
              </LandscapeButton>
            </div>
          </div>
        </>
      )}

      {/* Comparables Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'auto', width: 'max-content', minWidth: '100%' }}>
            {/* Column widths */}
            <colgroup>
              <col style={{ width: '220px', minWidth: '220px' }} />
              {comparables.map(comp => (
                <React.Fragment key={`colgroup-${comp.comparable_id}`}>
                  <col style={{ width: '128px', minWidth: '128px' }} />
                </React.Fragment>
              ))}
            </colgroup>

            <thead>
              {/* Main header row - Comp numbers with Edit/Save */}
              <tr
                className="border-b"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                <th
                  className="text-left py-1 px-2 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-card-header-bg)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>Comparable Sale</span>
                    <LandscapeButton
                      variant="ghost"
                      color="primary"
                      size="sm"
                      onClick={onAddComp}
                      className="!p-0 transition-opacity hover:opacity-70"
                      title="Add Comparable"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
                      </svg>
                    </LandscapeButton>
                  </div>
                </th>
                {comparables.map((comp, idx) => (
                  <th
                    key={`comp-header-${comp.comparable_id}`}
                    className="text-center py-1 px-2 font-semibold border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    <div className="flex flex-col items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                      <span>Comp {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <LandscapeButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => handleEditToggle(comp.comparable_id)}
                          className="!p-0 transition-opacity hover:opacity-70"
                          title={editingCompId === comp.comparable_id ? 'Save changes' : 'Edit comparable'}
                        >
                          {editingCompId === comp.comparable_id ? (
                            <svg className="icon" width="14" height="14" viewBox="0 0 512 512" style={{ opacity: 0.6 }}>
                              <path fill="var(--cui-success)" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"/>
                            </svg>
                          ) : (
                            <svg className="icon" width="14" height="14" viewBox="0 0 512 512" style={{ opacity: 0.5 }}>
                              <path fill="var(--cui-secondary-color)" d="M453.3125,120.99609,391.00391,58.6875a54.32117,54.32117,0,0,0-76.81641,0l-270.293,270.29688a7.99971,7.99971,0,0,0-2.34375,5.65625L32.00391,460.34766A7.99922,7.99922,0,0,0,40,468.00391l125.70312-9.55078a7.99971,7.99971,0,0,0,5.65625-2.34375L441.65234,185.8125l11.66016-11.66016A54.27776,54.27776,0,0,0,453.3125,120.99609ZM164.89844,440.918,47.41016,449.32422l8.40625-117.48828L243.26953,144.38281l109.08594,109.08594ZM442.03516,162.82422,430.37891,174.48047,321.29688,65.39844,332.95312,53.74219a38.35946,38.35946,0,1,1,54.24609,54.24609l.00391.00391Z"/>
                            </svg>
                          )}
                        </LandscapeButton>
                        <LandscapeButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => handleDeleteClick(comp.comparable_id)}
                          className="!p-0 transition-opacity hover:opacity-70"
                          title="Delete comparable"
                        >
                          <svg className="icon" width="14" height="14" viewBox="0 0 512 512" style={{ opacity: 0.5 }}>
                            <path fill="var(--cui-danger)" d="M437.332,80H348.84V62.592C348.84,28.038,320.802,0,286.248,0h-60.496c-34.554,0-62.592,28.038-62.592,62.592V80H74.668
                              c-8.284,0-15,6.716-15,15s6.716,15,15,15h21.332v336.208C96,476.963,131.037,512,161.792,512h188.417
                              c30.755,0,55.792-35.037,55.792-65.792V110h21.332c8.284,0,15-6.716,15-15S445.616,80,437.332,80z M193.16,62.592
                              c0-17.996,14.641-32.592,32.592-32.592h60.496c17.951,0,32.592,14.641,32.592,32.592V80H193.16V62.592z M376,446.208
                              C376,459.863,362.863,482,349.208,482H161.792C148.137,482,126,459.863,126,446.208V110h250V446.208z"/>
                            <path fill="var(--cui-danger)" d="M255.996,160c-8.284,0-15,6.716-15,15v241c0,8.284,6.716,15,15,15s15-6.716,15-15V175C270.996,166.716,264.28,160,255.996,160z"/>
                            <path fill="var(--cui-danger)" d="M192,160c-8.284,0-15,6.716-15,15v241c0,8.284,6.716,15,15,15s15-6.716,15-15V175C207,166.716,200.284,160,192,160z"/>
                            <path fill="var(--cui-danger)" d="M320,160c-8.284,0-15,6.716-15,15v241c0,8.284,6.716,15,15,15s15-6.716,15-15V175C335,166.716,328.284,160,320,160z"/>
                          </svg>
                        </LandscapeButton>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Location - Distance and Bearing */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Location
                </td>
                {comparables.map(comp => (
                <td
                    key={`loc-${comp.comparable_id}`}
                    className="py-1 px-4 text-center border-l text-sm"
                    style={{
                      color: 'var(--cui-secondary-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'city', { type: 'text', placeholder: 'City' })}
                  </td>
                ))}
              </tr>

              {/* Date */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Date
                </td>
                {comparables.map(comp => (
                <td
                    key={`date-${comp.comparable_id}`}
                    className="py-1 px-4 text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'sale_date', {
                      type: 'text',
                      placeholder: 'YYYY-MM-DD'
                    })}
                  </td>
                ))}
              </tr>

              {/* Sale Price */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Sale Price
                </td>
                {comparables.map(comp => (
                <td
                    key={`price-${comp.comparable_id}`}
                    className="py-1 px-4 font-medium text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'sale_price', {
                      type: 'text',
                      inputMode: 'decimal',
                      placeholder: 'Sale Price'
                    })}
                  </td>
                ))}
              </tr>

              {/* Price/Unit (or Price/Acre for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Price/Unit')}
                </td>
                {comparables.map(comp => (
                <td
                    key={`ppu-${comp.comparable_id}`}
                    className="py-1 px-4 font-medium text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'price_per_unit', {
                      type: 'text',
                      inputMode: 'decimal',
                      placeholder: 'Price/Unit'
                    })}
                  </td>
                ))}
              </tr>

              {/* Price/SF (or Price/Front Foot for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Price/SF')}
                </td>
                {comparables.map(comp => (
                <td
                    key={`psf-${comp.comparable_id}`}
                    className="py-1 px-4 font-medium text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'price_per_sf', {
                      type: 'text',
                      inputMode: 'decimal',
                      placeholder: 'Price/SF'
                    })}
                  </td>
                ))}
              </tr>

              {/* Units (or Acres for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Units')}
                </td>
                {comparables.map(comp => (
                <td
                    key={`units-${comp.comparable_id}`}
                    className="py-1 px-4 text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'units', {
                      type: 'text',
                      inputMode: 'numeric',
                      placeholder: 'Units'
                    })}
                  </td>
                ))}
              </tr>

              {/* Building SF (or Zoning for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Building SF')}
                </td>
                {comparables.map(comp => (
                <td
                    key={`bsf-${comp.comparable_id}`}
                    className="py-1 px-4 text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'building_sf', {
                      type: 'text',
                      inputMode: 'numeric',
                      placeholder: 'Building SF'
                    })}
                  </td>
                ))}
              </tr>

              {/* Cap Rate (or Entitlements for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Cap Rate')}
                </td>
                {comparables.map(comp => (
                <td
                    key={`cap-${comp.comparable_id}`}
                    className="py-1 px-4 text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'cap_rate', {
                      type: 'text',
                      inputMode: 'decimal',
                      placeholder: 'Cap Rate'
                    })}
                  </td>
                ))}
              </tr>

              {/* Year Built (or Utilities for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Year Built')}
                </td>
                {comparables.map(comp => (
                <td
                    key={`year-${comp.comparable_id}`}
                    className="py-1 px-4 text-center border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {renderEditableInput(comp, 'year_built', {
                      type: 'text',
                      inputMode: 'numeric',
                      placeholder: 'Year'
                    })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustments Table - Separate table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'auto', width: 'max-content', minWidth: '100%' }}>
            <colgroup>
              <col style={{ width: '220px', minWidth: '220px' }} />
              {comparables.map(comp => (
                <col key={`adj-col-${comp.comparable_id}`} style={{ width: '128px', minWidth: '128px' }} />
              ))}
            </colgroup>

            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: 'var(--cui-card-header-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                <td
                  className="py-2 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-card-header-bg)'
                  }}
                >
                  Adjustments
                </td>
                {comparables.map(comp => (
                  <td
                    key={`adj-header-${comp.comparable_id}`}
                    className="border-l"
                    style={{
                      borderColor: 'var(--cui-border-color)',
                      backgroundColor: 'var(--cui-card-header-bg)'
                    }}
                  >
                    {adjustmentsCollapsed && (
                      <div className="text-xs font-semibold" style={{ color: 'var(--cui-secondary-color)' }}>
                        {formatTotalAdjustment(comp.total_adjustment_pct)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {ADJUSTMENT_SECTIONS.map(section => (
                <React.Fragment key={`section-${section.key}`}>
                  <tr
                    className="border-b"
                    style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-subheader-bg)' }}
                  >
                    <td
                      className="py-2 px-4 font-semibold sticky left-0 z-10"
                      style={{
                        color: 'var(--cui-body-color)',
                        backgroundColor: 'var(--cui-card-subheader-bg)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        aria-expanded={openSections[section.key]}
                        className="w-full flex items-center gap-2 text-left"
                        style={{ color: 'var(--cui-body-color)' }}
                      >
                        <span
                          className={`inline-block transition-transform duration-150 ${openSections[section.key] ? 'rotate-90' : ''}`}
                          style={{ fontSize: '12px' }}
                          aria-hidden="true"
                        >
                          ▶
                        </span>
                        <span>{section.label}</span>
                      </button>
                    </td>
                    {comparables.map(comp => (
                      <td
                        key={`section-${section.key}-${comp.comparable_id}`}
                        className="py-2 px-4 border-l text-center"
                        style={{ borderColor: 'var(--cui-border-color)' }}
                      >
                        {/* Spacer cell */}
                      </td>
                    ))}
                  </tr>
                  {openSections[section.key] &&
                    section.adjustments.map(adj =>
                      renderAdjustmentRow(section.key, adj.type, adj.label, adj.indent)
                    )}
                </React.Fragment>
              ))}

              <tr
                className="border-b"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'var(--cui-tertiary-bg)'
                }}
              >
                <td
                  className="py-2 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-tertiary-bg)'
                  }}
                >
                  Total Adjustments
                </td>
                {comparables.map(comp => (
                  <td
                    key={`total-${comp.comparable_id}`}
                    className="py-2 px-4 font-bold text-center border-l"
                    style={{
                      color: comp.total_adjustment_pct > 0
                        ? 'var(--cui-success)'
                        : comp.total_adjustment_pct < 0
                        ? 'var(--cui-danger)'
                        : 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    {comp.total_adjustment_pct > 0 ? '+' : ''}
                    {(comp.total_adjustment_pct * 100).toFixed(0)}%
                  </td>
                ))}
              </tr>

              <tr style={{ backgroundColor: 'var(--surface-subheader)' }}>
                <td
                  className="py-3 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-tertiary-bg)'
                  }}
                >
                  Adjusted Price/Unit
                </td>
                {comparables.map(comp => (
                  <td
                    key={`adj-price-${comp.comparable_id}`}
                    className="py-3 px-4 font-bold text-base text-center border-l"
                    style={{
                      color: 'var(--cui-primary)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    {formatCurrency(comp.adjusted_price_per_unit ? Number(comp.adjusted_price_per_unit) : null)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>
      <style jsx global>{`
        .comparables-grid input,
        .comparables-grid input[type="text"],
        .comparables-grid input[type="number"] {
          border: none !important;
          border-width: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          background-color: transparent !important;
          background-clip: border-box !important;
          background-image: none !important;
          filter: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          --cui-focus-ring: transparent !important;
          --cui-input-border-color: transparent !important;
          --cui-input-box-shadow: none !important;
        }
        .comparables-grid input::before,
        .comparables-grid input::after,
        .comparables-grid td::before,
        .comparables-grid td::after {
          box-shadow: none !important;
          border: none !important;
          background: transparent !important;
        }
        .comparables-grid td,
        .comparables-grid td:focus-within,
        .comparables-grid td:focus,
        .comparables-grid td:hover {
          box-shadow: none !important;
          outline: none !important;
          background-clip: border-box !important;
          background-image: none !important;
          filter: none !important;
        }
        .comparables-grid input:hover,
        .comparables-grid input:focus,
        .comparables-grid input:focus-visible,
        .comparables-grid input:active {
          border: none !important;
          border-width: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          background-color: transparent !important;
        }
      `}</style>
    </>
  );
}
