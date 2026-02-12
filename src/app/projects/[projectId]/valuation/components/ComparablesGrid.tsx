/**
 * ComparablesGrid Component
 *
 * Displays all sales comparables in a horizontal table format
 * and an accordion-style adjustments grid with one input column per comparable.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type {
  SalesComparable,
  SalesCompAdjustment,
  SalesComparableForm
} from '@/types/valuation';
import { AdjustmentCell } from './AdjustmentCell';
import { updateSalesComparable, updateUserAdjustment } from '@/lib/api/valuation';
import { LandscapeButton } from '@/components/ui/landscape';
import EntityMediaDisplay from '@/components/shared/EntityMediaDisplay';
import MediaPickerModal from '@/components/dms/modals/MediaPickerModal';

interface SubjectPropertyInfo {
  city?: string | null;
  analysisStartDate?: string | null;
  units?: number | null;
  buildingSf?: number | string | null;
  yearBuilt?: number | null;
  ownershipType?: string | null;
}

interface ComparablesGridProps {
  comparables: SalesComparable[];
  projectId: number;
  subjectProperty?: SubjectPropertyInfo;
  onEdit?: (comp: SalesComparable) => void;
  onDelete?: (compId: number) => Promise<void>;
  onRefresh?: () => void;
  onAddComp?: () => void;
  mode?: 'multifamily' | 'land'; // Field label mode: multifamily (default) or land sales
}

type AdjustmentSectionKey = 'transaction' | 'property';

type AdjustmentDef = { type: string; label: string; indent: number; source: 'backend' | 'local' };
type AdjustmentSectionDef = { key: AdjustmentSectionKey; label: string; adjustments: AdjustmentDef[] };

const ADJUSTMENT_SECTIONS_MF: AdjustmentSectionDef[] = [
  {
    key: 'transaction',
    label: 'Transaction',
    adjustments: [
      { type: 'property_rights', label: 'Property Rights', indent: 1, source: 'backend' },
      { type: 'financing', label: 'Financing', indent: 1, source: 'backend' },
      { type: 'conditions_of_sale', label: 'Conditions of Sale', indent: 1, source: 'backend' },
      { type: 'market_conditions', label: 'Market Conditions', indent: 1, source: 'backend' },
      { type: 'other', label: 'Other', indent: 1, source: 'backend' },
    ]
  },
  {
    key: 'property',
    label: 'Property',
    adjustments: [
      { type: 'location', label: 'Location', indent: 2, source: 'backend' },
      { type: 'size_units', label: 'Size (Units)', indent: 2, source: 'local' },
      { type: 'physical_age', label: 'Age / Condition', indent: 2, source: 'backend' },
      { type: 'physical_unit_mix', label: 'Unit Mix', indent: 2, source: 'backend' },
      { type: 'economic', label: 'Economic', indent: 2, source: 'backend' },
      { type: 'deferred_maintenance', label: 'Deferred Maint', indent: 2, source: 'local' },
      { type: 'property_other', label: 'Other', indent: 2, source: 'local' },
    ]
  }
];

const ADJUSTMENT_SECTIONS_LAND: AdjustmentSectionDef[] = [
  {
    key: 'transaction',
    label: 'Transaction',
    adjustments: [
      { type: 'property_rights', label: 'Property Rights', indent: 1, source: 'backend' },
      { type: 'financing', label: 'Financing', indent: 1, source: 'backend' },
      { type: 'conditions_of_sale', label: 'Conditions of Sale', indent: 1, source: 'backend' },
      { type: 'market_conditions', label: 'Market Conditions', indent: 1, source: 'backend' },
      { type: 'other', label: 'Other', indent: 1, source: 'backend' },
    ]
  },
  {
    key: 'property',
    label: 'Property',
    adjustments: [
      { type: 'location', label: 'Location', indent: 2, source: 'backend' },
      { type: 'size_acres', label: 'Size (Acres)', indent: 2, source: 'local' },
      { type: 'shape', label: 'Shape', indent: 2, source: 'local' },
      { type: 'topography', label: 'Topography', indent: 2, source: 'local' },
      { type: 'property_other', label: 'Other', indent: 2, source: 'local' },
    ]
  }
];

export function ComparablesGrid({ comparables, projectId, subjectProperty, onEdit, onDelete, onRefresh, onAddComp, mode = 'multifamily' }: ComparablesGridProps) {
  const ADJUSTMENT_SECTIONS = mode === 'land' ? ADJUSTMENT_SECTIONS_LAND : ADJUSTMENT_SECTIONS_MF;
  const [openSections, setOpenSections] = useState<Record<AdjustmentSectionKey, boolean>>({
    transaction: true,
    property: true
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState<{ compId: number; comp: SalesComparable } | null>(null);
  const [mediaPickerComp, setMediaPickerComp] = useState<SalesComparable | null>(null);
  const [pendingValues, setPendingValues] = useState<Record<number, Record<string, string>>>({});
  const [subjectAdjustments, setSubjectAdjustments] = useState<Record<string, string>>({});
  const [ownershipOptions, setOwnershipOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subjectOwnership, setSubjectOwnership] = useState<string>('');
  const compColumnWidth = 128;
  const compColumnStyle = { width: `${compColumnWidth}px`, minWidth: `${compColumnWidth}px` };
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

  const formatCapRateValue = (value: number | string | null | undefined) => {
    if (value == null || value === '') return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatSubjectValue = (value: string | number | null | undefined) => {
    if (value == null || value === '') return '-';
    return String(value);
  };

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit'
  });

  useEffect(() => {
    let active = true;
    const loadOwnershipOptions = async () => {
      try {
        const response = await fetch('/api/lookups/ownership-types');
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setOwnershipOptions(Array.isArray(data?.options) ? data.options : []);
      } catch (error) {
        console.error('Failed to load ownership types:', error);
      }
    };

    loadOwnershipOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!subjectProperty?.ownershipType || subjectOwnership) return;
    const raw = subjectProperty.ownershipType.trim();
    if (!raw) return;
    const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_');
    const matched = ownershipOptions.find(option =>
      option.value.toLowerCase() === normalized ||
      option.label.toLowerCase() === raw.toLowerCase()
    );
    setSubjectOwnership(matched?.value || raw);
  }, [ownershipOptions, subjectOwnership, subjectProperty?.ownershipType]);

  useEffect(() => {
    if (!subjectProperty) return;
    const currentYear = new Date().getFullYear();
    const subjectCity = subjectProperty.city ?? '';
    const subjectAge = subjectProperty.yearBuilt ? `${currentYear - subjectProperty.yearBuilt}` : 'N/A';

    setSubjectAdjustments(prev => {
      const next = { ...prev };
      if (next.financing == null) next.financing = 'All Cash';
      if (next.conditions_of_sale == null) next.conditions_of_sale = 'Arms Length';
      if (next.market_conditions == null) next.market_conditions = 'Current';
      if (next.other == null) next.other = 'N/A';
      if (next.location == null) next.location = subjectCity || 'N/A';
      if (next.size_units == null) next.size_units = subjectProperty.units != null ? `${subjectProperty.units}` : '';
      if (next.physical_age == null) next.physical_age = subjectAge;
      if (next.physical_unit_mix == null) next.physical_unit_mix = 'N/A';
      if (next.economic == null) next.economic = 'N/A';
      if (next.deferred_maintenance == null) next.deferred_maintenance = '-';
      if (next.property_other == null) next.property_other = '';
      return next;
    });
  }, [subjectProperty]);

  const formatDateLabel = (value: string | null | undefined) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const parts = dateFormatter.formatToParts(parsed);
    const month = parts.find(part => part.type === 'month')?.value ?? '';
    const year = parts.find(part => part.type === 'year')?.value ?? '';
    return month && year ? `${month}-${year}` : `${month}${year}`;
  };

  const subjectCityLabel = formatSubjectValue(subjectProperty?.city);
  const subjectAnalysisDateLabel = subjectProperty?.analysisStartDate
    ? formatDateLabel(subjectProperty.analysisStartDate)
    : '-';
  const subjectUnitsLabel = subjectProperty?.units != null
    ? formatNumberWithCommas(subjectProperty.units)
    : '-';
  const subjectBuildingSfLabel = subjectProperty?.buildingSf != null
    ? formatNumberWithCommas(Number(subjectProperty.buildingSf))
    : '-';
  const subjectYearBuiltLabel = subjectProperty?.yearBuilt != null
    ? formatYearValue(subjectProperty.yearBuilt)
    : '-';

  const getCurrentAdjustment = (comp: SalesComparable, adjType: string): SalesCompAdjustment | null => {
    if (adjType === 'physical_age') {
      return (
        comp.adjustments?.find(a => a.adjustment_type === 'physical_age') ||
        comp.adjustments?.find(a => a.adjustment_type === 'physical_condition') ||
        null
      );
    }
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
        return formatCapRateValue(comp.cap_rate);
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
      await updateSalesComparable(comp.project_id, comp.comparable_id, payload);
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

  const getAdjustmentValue = (adjustment: SalesCompAdjustment) => {
    const rawValue = adjustment.user_adjustment_pct ?? adjustment.adjustment_pct;
    if (rawValue == null) return 0;
    const numValue = Number(rawValue);
    return Number.isFinite(numValue) ? numValue : 0;
  };

  const transactionAdjustmentTypes = ADJUSTMENT_SECTIONS
    .find(section => section.key === 'transaction')
    ?.adjustments.filter(adj => adj.source === 'backend')
    .map(adj => adj.type) ?? [];

  const propertyAdjustmentTypes = ADJUSTMENT_SECTIONS
    .find(section => section.key === 'property')
    ?.adjustments.filter(adj => adj.source === 'backend')
    .map(adj => adj.type) ?? [];

  const getAdjustmentByType = (comp: SalesComparable, adjType: string) => {
    if (adjType === 'physical_age') {
      return (
        comp.adjustments?.find(adj => adj.adjustment_type === 'physical_age') ||
        comp.adjustments?.find(adj => adj.adjustment_type === 'physical_condition') ||
        null
      );
    }
    return comp.adjustments?.find(adj => adj.adjustment_type === adjType) ?? null;
  };

  const getTransactionAdjustmentPct = (comp: SalesComparable) => {
    return transactionAdjustmentTypes.reduce((sum, adjType) => {
      const adjustment = getAdjustmentByType(comp, adjType);
      if (!adjustment) return sum;
      return sum + getAdjustmentValue(adjustment);
    }, 0);
  };

  const getPropertyAdjustmentPct = (comp: SalesComparable) => {
    return propertyAdjustmentTypes.reduce((sum, adjType) => {
      const adjustment = getAdjustmentByType(comp, adjType);
      if (!adjustment) return sum;
      return sum + getAdjustmentValue(adjustment);
    }, 0);
  };

  const getTotalAdjustmentPct = (comp: SalesComparable) => {
    const transactionAdj = getTransactionAdjustmentPct(comp);
    const propertyAdj = getPropertyAdjustmentPct(comp);
    return transactionAdj + propertyAdj;
  };

  const getBasePricePerUnit = (comp: SalesComparable) => {
    const pricePerUnit = comp.price_per_unit != null ? Number(comp.price_per_unit) : null;
    if (pricePerUnit != null && Number.isFinite(pricePerUnit)) return pricePerUnit;
    const salePrice = comp.sale_price != null ? Number(comp.sale_price) : null;
    const units = comp.units != null ? Number(comp.units) : null;
    if (salePrice != null && units != null && Number.isFinite(salePrice) && Number.isFinite(units) && units !== 0) {
      return salePrice / units;
    }
    return null;
  };

  const getAdjustedPricePerUnit = (comp: SalesComparable) => {
    const basePrice = getBasePricePerUnit(comp);
    if (basePrice == null) return null;
    const totalAdj = getTotalAdjustmentPct(comp);
    const adjusted = basePrice * (1 + totalAdj);
    if (!Number.isFinite(adjusted)) return null;
    return adjusted;
  };

  const handleSubjectAdjustmentChange = (adjType: string, value: string) => {
    setSubjectAdjustments(prev => ({
      ...prev,
      [adjType]: value
    }));
  };

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const toggleSection = (sectionKey: AdjustmentSectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const subjectOwnershipIsCustom = Boolean(
    subjectOwnership && !ownershipOptions.some(option => option.value === subjectOwnership)
  );

  const renderSubjectAdjustmentCell = (
    sectionKey: AdjustmentSectionKey,
    adjType: string,
    source: 'backend' | 'local'
  ) => {
    const isPropertyOther = sectionKey === 'property' && adjType === 'property_other';
    const isDeferredMaintenance = adjType === 'deferred_maintenance';
    const valueKey = isPropertyOther ? 'property_other' : adjType;
    const currentValue = subjectAdjustments[valueKey] ?? '';
    const placeholder = isPropertyOther ? 'N/A' : isDeferredMaintenance ? '-' : '-';

    const handleDeferredBlur = () => {
      if (!isDeferredMaintenance) return;
      const cleaned = currentValue.replace(/[^0-9.\-]/g, '');
      if (cleaned === '' || cleaned === '-') {
        handleSubjectAdjustmentChange(valueKey, '-');
        return;
      }
      const numValue = parseFloat(cleaned);
      if (!Number.isNaN(numValue)) {
        handleSubjectAdjustmentChange(valueKey, formatCurrencyValue(numValue));
      }
    };

    return (
    <td
      key={`subject-${adjType}`}
      className="py-1 px-4 text-center border-l"
      style={{
        borderColor: 'var(--cui-border-color)',
        whiteSpace: 'nowrap'
      }}
    >
      {adjType === 'property_rights' ? (
        <select
          value={subjectOwnership}
          onChange={(event) => setSubjectOwnership(event.target.value)}
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
            minHeight: '20px'
          }}
        >
          <option value="">Select</option>
          {subjectOwnershipIsCustom && (
            <option value={subjectOwnership}>
              {subjectProperty?.ownershipType || subjectOwnership}
            </option>
          )}
          {ownershipOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={currentValue}
          onChange={(event) => handleSubjectAdjustmentChange(valueKey, event.target.value)}
          onBlur={handleDeferredBlur}
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
            minHeight: '20px'
          }}
        />
      )}
    </td>
    );
  };

  // Render adjustment row helper
  const renderAdjustmentRow = (
    sectionKey: AdjustmentSectionKey,
    adjType: string,
    label: string,
    indentLevel: number,
    source: 'backend' | 'local'
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
        {renderSubjectAdjustmentCell(sectionKey, adjType, source)}
        {source === 'backend'
          ? comparables.map(comp => (
            <AdjustmentCell
              key={`${sectionKey}-${adjType}-${comp.comparable_id}`}
              comparableId={comp.comparable_id}
              adjustmentType={adjType}
              currentAdjustment={getCurrentAdjustment(comp, adjType)}
              onFinalChange={handleFinalChange}
            />
          ))
          : comparables.map(comp => (
            <td
              key={`${sectionKey}-${adjType}-${comp.comparable_id}`}
              className="py-1 px-4 text-center border-l"
              style={{
                color: 'var(--cui-secondary-color)',
                borderColor: 'var(--cui-border-color)',
                whiteSpace: 'nowrap'
              }}
            >
              -
            </td>
          ))
        }
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
                        const totalAdj = Math.abs(getTotalAdjustmentPct(comp) * 100);

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
              <col style={compColumnStyle} />
      {comparables.map(comp => (
        <React.Fragment key={`colgroup-${comp.comparable_id}`}>
          <col style={compColumnStyle} />
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
                <th
                  className="text-center py-1 px-2 font-semibold border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)'
                  }}
                >
                  <div className="flex flex-col items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                    <span>Subject</span>
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
                      <span className="flex items-center gap-2">
                        Comp {idx + 1}
                        {onEdit && (
                          <LandscapeButton
                            variant="ghost"
                            color="secondary"
                            size="sm"
                            onClick={() => onEdit(comp)}
                            className="!p-0 transition-opacity hover:opacity-70"
                            title="Edit comparable"
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.5 }}>
                              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/>
                            </svg>
                          </LandscapeButton>
                        )}
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
                      </span>
                      <div className="flex items-center gap-2">
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Photo Row */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-1 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)',
                  }}
                >
                  Photo
                </td>
                <td
                  className="py-1 px-4 text-center border-l"
                  style={{ borderColor: 'var(--cui-border-color)' }}
                >
                  {/* Subject — no photo */}
                </td>
                {comparables.map((comp) => (
                  <td
                    key={`photo-${comp.comparable_id}`}
                    className="py-1 px-2 text-center border-l"
                    style={{ borderColor: 'var(--cui-border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <EntityMediaDisplay
                        entityType="comp_sale"
                        entityId={comp.comparable_id}
                        projectId={projectId}
                        variant="single-thumb"
                        editable={true}
                        onAttach={() => setMediaPickerComp(comp)}
                      />
                    </div>
                  </td>
                ))}
              </tr>

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
                <td
                  key="subject-location"
                  className="py-1 px-4 text-center border-l text-sm"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subjectCityLabel}
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
                <td
                  key="subject-date"
                  className="py-1 px-4 text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subjectAnalysisDateLabel}
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
                <td
                  key="subject-sale-price"
                  className="py-1 px-4 font-medium text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  N/A
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
                <td
                  key="subject-ppu"
                  className="py-1 px-4 font-medium text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  N/A
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
                <td
                  key="subject-psf"
                  className="py-1 px-4 font-medium text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  N/A
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
                <td
                  key="subject-units"
                  className="py-1 px-4 text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subjectUnitsLabel}
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
                <td
                  key="subject-building-sf"
                  className="py-1 px-4 text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subjectBuildingSfLabel}
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
                <td
                  key="subject-cap-rate"
                  className="py-1 px-4 text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  N/A
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
                      placeholder: ''
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
                <td
                  key="subject-year-built"
                  className="py-1 px-4 text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subjectYearBuiltLabel}
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
              <col style={compColumnStyle} />
              {comparables.map(comp => (
                <col key={`adj-col-${comp.comparable_id}`} style={compColumnStyle} />
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
                <td
                  className="border-l"
                  style={{
                    borderColor: 'var(--cui-border-color)',
                    backgroundColor: 'var(--cui-card-header-bg)'
                  }}
                >
                  <div
                    className="text-xs font-semibold text-center"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    Subject
                  </div>
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
                        {formatTotalAdjustment(getTotalAdjustmentPct(comp))}
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
                    <td
                      className="py-2 px-4 border-l text-center"
                      style={{ borderColor: 'var(--cui-border-color)' }}
                    >
                      {/* Subject spacer */}
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
                      renderAdjustmentRow(section.key, adj.type, adj.label, adj.indent, adj.source)
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
                <td
                  className="py-2 px-4 font-bold text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)'
                  }}
                >
                  N/A
                </td>
                {comparables.map(comp => {
                  const totalAdjustmentPct = getTotalAdjustmentPct(comp);
                  return (
                    <td
                      key={`total-${comp.comparable_id}`}
                      className="py-2 px-4 font-bold text-center border-l"
                      style={{
                        color: totalAdjustmentPct > 0
                          ? 'var(--cui-success)'
                          : totalAdjustmentPct < 0
                          ? 'var(--cui-danger)'
                          : 'var(--cui-body-color)',
                        borderColor: 'var(--cui-border-color)'
                      }}
                    >
                      {totalAdjustmentPct > 0 ? '+' : ''}
                      {(totalAdjustmentPct * 100).toFixed(0)}%
                    </td>
                  );
                })}
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
                <td
                  className="py-3 px-4 font-bold text-base text-center border-l"
                  style={{
                    color: 'var(--cui-body-color)',
                    borderColor: 'var(--cui-border-color)'
                  }}
                >
                  N/A
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
                    {formatCurrency(getAdjustedPricePerUnit(comp))}
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

      {/* Media Picker Modal for comps */}
      {mediaPickerComp && (
        <MediaPickerModal
          isOpen={!!mediaPickerComp}
          onClose={() => setMediaPickerComp(null)}
          projectId={projectId}
          entityType="comp_sale"
          entityId={mediaPickerComp.comparable_id}
          linkPurpose="hero_image"
          singleSelect={true}
          filterClassification={['property_photo', 'aerial_photo']}
          onSelect={() => setMediaPickerComp(null)}
        />
      )}
    </>
  );
}
