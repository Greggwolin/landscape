'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody,
  CSpinner,
  CRow,
  CCol,
  CBadge,
  CFormInput,
  CFormSelect,
} from '@coreui/react';
import { formatNumber, formatCurrency } from '@/utils/formatNumber';
import { useAuth } from '@/contexts/AuthContext';

interface PhysicalDescriptionProps {
  projectId: number;
  compact?: boolean; // When true, uses tighter spacing and no outer card wrapper
}

interface PropertyData {
  // Property Identification
  propertyName: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  county: string | null;
  apnPrimary: string | null;
  apnSecondary: string | null;
  // Site Characteristics
  lotSizeAcres: number | null;
  lotSizeSF: number | null;
  currentZoning: string | null;
  proposedZoning: string | null;
  floodZone: string | null;
  topography: string | null;
  siteShape: string | null;
  siteUtilityRating: number | null;
  locationRating: number | null;
  accessRating: number | null;
  visibilityRating: number | null;
  // Building Characteristics
  totalUnits: number | null;
  netRentableArea: number | null;
  grossSF: number | null;
  buildingCount: number | null;
  stories: number | null;
  yearBuilt: number | null;
  effectiveAge: number | null;
  remainingEconomicLife: number | null;
  totalEconomicLife: number | null;
  constructionType: string | null;
  constructionClass: string | null;
  propertyClass: string | null;
  conditionRating: number | null;
  qualityRating: number | null;
  landToBuildingRatio: number | null;
  // Parking
  parkingSpaces: number | null;
  parkingRatio: number | null;
  parkingType: string | null;
  // Location
  market: string | null;
  submarket: string | null;
  walkScore: number | null;
  bikeScore: number | null;
  transitScore: number | null;
  // Additional from JSONB
  siteAttributes: Record<string, unknown> | null;
  improvementAttributes: Record<string, unknown> | null;
}

// Section keys as constants
const SECTION_KEYS = {
  PROPERTY_ID: 'property-identification',
  SITE: 'site-characteristics',
  BUILDING: 'building-characteristics',
  PARKING: 'parking-access',
  CONDITION: 'condition-quality',
  LOCATION: 'location-scores',
} as const;

// Rating options for dropdowns
const RATING_OPTIONS = [
  { value: '', label: '—' },
  { value: '1', label: '★☆☆☆☆ (1)' },
  { value: '2', label: '★★☆☆☆ (2)' },
  { value: '3', label: '★★★☆☆ (3)' },
  { value: '4', label: '★★★★☆ (4)' },
  { value: '5', label: '★★★★★ (5)' },
];

interface EditableFieldRowProps {
  label: string;
  value: string | number | boolean | null | undefined;
  fieldKey: string;
  onSave: (key: string, value: string | number | null) => void;
  suffix?: string;
  format?: 'number' | 'currency' | 'rating' | 'boolean' | 'text';
  inputType?: 'text' | 'number' | 'select';
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * Check if a value is populated (not null, undefined, or empty string)
 */
function isPopulated(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Editable field row for physical description - click to edit inline
 */
function EditableFieldRow({
  label,
  value,
  fieldKey,
  onSave,
  suffix,
  format = 'text',
  inputType = 'text',
  selectOptions,
  placeholder,
}: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDisplayValue = (): string => {
    if (value === null || value === undefined || value === '') return '—';

    switch (format) {
      case 'number': {
        // Handle both number and string inputs (API may return strings)
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue === 'number' && !isNaN(numValue)) {
          return formatNumber(numValue) + (suffix || '');
        }
        return String(value);
      }
      case 'currency': {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue === 'number' && !isNaN(numValue)) {
          return formatCurrency(numValue);
        }
        return String(value);
      }
      case 'rating': {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (typeof numValue === 'number' && !isNaN(numValue)) {
          const stars = '★'.repeat(Math.min(numValue, 5)) + '☆'.repeat(Math.max(0, 5 - numValue));
          return `${stars} (${numValue}/5)`;
        }
        return String(value);
      }
      case 'boolean':
        return value === true ? 'Yes' : value === false ? 'No' : '—';
      default:
        return String(value) + (suffix || '');
    }
  };

  const getRawValue = (): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const handleClick = () => {
    if (!isEditing) {
      setEditValue(getRawValue());
      setIsEditing(true);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    let newValue: string | number | null = editValue.trim();

    // Convert to appropriate type
    if (newValue === '') {
      newValue = null;
    } else if (format === 'number' || format === 'rating' || inputType === 'number') {
      const parsed = parseFloat(newValue);
      newValue = isNaN(parsed) ? null : parsed;
    }

    // Only save if value changed
    const currentRaw = getRawValue();
    if (String(newValue ?? '') !== currentRaw) {
      setIsSaving(true);
      try {
        await onSave(fieldKey, newValue);
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  }, [editValue, fieldKey, format, inputType, isSaving, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(getRawValue());
    }
  };

  const handleBlur = () => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 100);
  };

  const displayValue = formatDisplayValue();
  const isEmpty = displayValue === '—';

  return (
    <div
      className="editable-field-row d-flex justify-content-between align-items-center py-1"
      style={{ gap: '0.5rem' }}
    >
      <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.8rem', fontWeight: 500, flexShrink: 0 }}>{label}</span>

      {isEditing ? (
        <div className="d-flex align-items-center gap-1" style={{ minWidth: '120px', maxWidth: '180px', flexShrink: 0 }}>
          {format === 'rating' || (selectOptions && selectOptions.length > 0) ? (
            <CFormSelect
              size="sm"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={isSaving}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
              {(selectOptions || RATING_OPTIONS).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CFormSelect>
          ) : (
            <CFormInput
              ref={inputRef}
              size="sm"
              type={inputType === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={isSaving}
              placeholder={placeholder || '—'}
              style={{
                fontSize: '0.8rem',
                padding: '0.25rem 0.5rem',
                textAlign: 'right',
              }}
            />
          )}
          {isSaving && <CSpinner size="sm" style={{ width: '14px', height: '14px' }} />}
        </div>
      ) : (
        <span
          className="studio-tnum editable-value"
          onClick={handleClick}
          style={{
            color: isEmpty ? 'var(--cui-secondary-color)' : 'var(--cui-body-color)',
            fontSize: '0.875rem',
            fontWeight: isEmpty ? 400 : 500,
            cursor: 'pointer',
            padding: '0.125rem 0.375rem',
            borderRadius: '4px',
            transition: 'background-color 0.15s',
            textAlign: 'right',
            wordBreak: 'break-word',
          }}
          title="Click to edit"
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}

/**
 * Progress bar with gradient and clickable pill
 */
interface SectionProgressProps {
  filled: number;
  total: number;
  showAll: boolean;
  onToggle: () => void;
}

function SectionProgress({ filled, total, showAll, onToggle }: SectionProgressProps) {
  const pct = total > 0 ? (filled / total) * 100 : 0;

  return (
    <div className="d-flex align-items-center gap-2">
      {/* Gradient progress bar - thicker */}
      <div
        style={{
          width: '60px',
          height: '10px',
          borderRadius: '5px',
          background: 'var(--cui-border-color)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 80
              ? 'linear-gradient(90deg, var(--cui-success), var(--cui-success))'
              : pct >= 50
                ? 'linear-gradient(90deg, var(--cui-warning), var(--cui-warning))'
                : 'linear-gradient(90deg, var(--cui-primary), var(--cui-primary))',
            borderRadius: '5px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {/* Clickable pill with count */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: showAll ? 'var(--cui-primary)' : 'var(--cui-secondary-bg)',
          color: showAll ? 'white' : 'var(--cui-secondary-color)',
          border: `1px solid ${showAll ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
          borderRadius: '12px',
          padding: '0.125rem 0.5rem',
          fontSize: '0.7rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
        title={showAll ? 'Click to show only populated fields' : 'Click to show all fields'}
      >
        {filled} / {total}
      </button>
    </div>
  );
}

/**
 * PhysicalDescription - Comprehensive property characteristics component
 *
 * Displays ARGUS-level field coverage in collapsible accordion sections.
 * Data sources:
 * - tbl_project columns for standard fields
 * - site_attributes JSONB for additional site data
 * - improvement_attributes JSONB for additional building data
 */
// Map frontend field keys to Django API field names
const FIELD_KEY_TO_API: Record<string, string> = {
  propertyName: 'project_name',
  streetAddress: 'street_address',
  city: 'city',
  state: 'state',
  zipCode: 'zip_code',
  county: 'county',
  apnPrimary: 'apn_primary',
  apnSecondary: 'apn_secondary',
  lotSizeAcres: 'lot_size_acres',
  lotSizeSF: 'lot_size_sf',
  currentZoning: 'current_zoning',
  proposedZoning: 'proposed_zoning',
  floodZone: 'flood_zone',
  topography: 'topography',
  siteShape: 'site_shape',
  siteUtilityRating: 'site_utility_rating',
  locationRating: 'location_rating',
  accessRating: 'access_rating',
  visibilityRating: 'visibility_rating',
  totalUnits: 'total_units',
  netRentableArea: 'net_rentable_area',
  grossSF: 'gross_sf',
  buildingCount: 'building_count',
  stories: 'stories',
  yearBuilt: 'year_built',
  effectiveAge: 'effective_age',
  remainingEconomicLife: 'remaining_economic_life',
  totalEconomicLife: 'total_economic_life',
  constructionType: 'construction_type',
  constructionClass: 'construction_class',
  propertyClass: 'property_class',
  conditionRating: 'condition_rating',
  qualityRating: 'quality_rating',
  landToBuildingRatio: 'land_to_building_ratio',
  parkingSpaces: 'parking_spaces',
  parkingRatio: 'parking_ratio',
  parkingType: 'parking_type',
  market: 'market',
  submarket: 'submarket',
  walkScore: 'walk_score',
  bikeScore: 'bike_score',
  transitScore: 'transit_score',
};

export default function PhysicalDescription({ projectId, compact = false }: PhysicalDescriptionProps) {
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  // Track which sections show all fields (vs only populated)
  const [showAllFields, setShowAllFields] = useState<Record<string, boolean>>({});

  const toggleShowAll = (sectionKey: string) => {
    setShowAllFields((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Handle saving a field value to the API
  const handleFieldSave = useCallback(
    async (fieldKey: string, value: string | number | null) => {
      const apiFieldName = FIELD_KEY_TO_API[fieldKey];
      if (!apiFieldName) {
        console.error(`[PhysicalDescription] Unknown field key: ${fieldKey}`);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

      // Build payload - may include calculated fields for lot size conversion
      const payload: Record<string, unknown> = { [apiFieldName]: value };

      // Auto-calculate lot size conversions (1 acre = 43,560 SF)
      if (fieldKey === 'lotSizeAcres' && typeof value === 'number') {
        const sfValue = Math.round(value * 43560);
        payload['lot_size_sf'] = sfValue;
      } else if (fieldKey === 'lotSizeSF' && typeof value === 'number') {
        const acresValue = Number((value / 43560).toFixed(4));
        payload['lot_size_acres'] = acresValue;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (tokens?.access) {
          headers['Authorization'] = `Bearer ${tokens.access}`;
        }

        const response = await fetch(`${apiUrl}/api/projects/${projectId}/`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to save: ${response.status}`);
        }

        // Update local state including calculated fields
        setPropertyData((prev) => {
          if (!prev) return prev;
          const updates: Partial<PropertyData> = { [fieldKey]: value };

          // Auto-update the related lot size field in local state
          if (fieldKey === 'lotSizeAcres' && typeof value === 'number') {
            updates.lotSizeSF = Math.round(value * 43560);
          } else if (fieldKey === 'lotSizeSF' && typeof value === 'number') {
            updates.lotSizeAcres = Number((value / 43560).toFixed(4));
          }

          return { ...prev, ...updates };
        });
      } catch (err) {
        console.error(`[PhysicalDescription] Error saving ${fieldKey}:`, err);
        // Could show a toast notification here
      }
    },
    [projectId, tokens]
  );

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        let data;

        // Build headers with auth token
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (tokens?.access) {
          headers['Authorization'] = `Bearer ${tokens.access}`;
        }

        // Try Django API first, fall back to Next.js API
        const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
        const djangoResponse = await fetch(`${djangoUrl}/api/projects/${projectId}/`, { headers });

        if (djangoResponse.ok) {
          data = await djangoResponse.json();
        } else {
          // Fallback to Next.js API
          const nextResponse = await fetch(`/api/projects/${projectId}`);
          if (!nextResponse.ok) {
            throw new Error(`Failed to fetch project: ${nextResponse.status}`);
          }
          data = await nextResponse.json();
        }

        // Map API response to PropertyData
        setPropertyData({
          // Property Identification
          propertyName: data.project_name || null,
          streetAddress: data.street_address || data.project_address || null,
          city: data.city || data.jurisdiction_city || null,
          state: data.state || data.jurisdiction_state || null,
          zipCode: data.zip_code || null,
          county: data.county || data.jurisdiction_county || null,
          apnPrimary: data.apn_primary || null,
          apnSecondary: data.apn_secondary || null,
          // Site Characteristics
          lotSizeAcres: data.lot_size_acres || data.acres_gross || null,
          lotSizeSF: data.lot_size_sf || null,
          currentZoning: data.current_zoning || null,
          proposedZoning: data.proposed_zoning || null,
          floodZone: data.flood_zone || null,
          topography: data.topography || null,
          siteShape: data.site_shape || null,
          siteUtilityRating: data.site_utility_rating || null,
          locationRating: data.location_rating || null,
          accessRating: data.access_rating || null,
          visibilityRating: data.visibility_rating || null,
          // Building Characteristics
          totalUnits: data.total_units || null,
          netRentableArea: data.net_rentable_area || null,
          grossSF: data.gross_sf || null,
          buildingCount: data.building_count || null,
          stories: data.stories || null,
          yearBuilt: data.year_built || null,
          effectiveAge: data.effective_age || null,
          remainingEconomicLife: data.remaining_economic_life || null,
          totalEconomicLife: data.total_economic_life || null,
          constructionType: data.construction_type || null,
          constructionClass: data.construction_class || null,
          propertyClass: data.property_class || null,
          conditionRating: data.condition_rating || null,
          qualityRating: data.quality_rating || null,
          landToBuildingRatio: data.land_to_building_ratio || null,
          // Parking
          parkingSpaces: data.parking_spaces || null,
          parkingRatio: data.parking_ratio || null,
          parkingType: data.parking_type || null,
          // Location
          market: data.market || null,
          submarket: data.submarket || null,
          walkScore: data.walk_score || null,
          bikeScore: data.bike_score || null,
          transitScore: data.transit_score || null,
          // JSONB
          siteAttributes: data.site_attributes || null,
          improvementAttributes: data.improvement_attributes || null,
        });
      } catch (err) {
        console.error('[PhysicalDescription] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load property data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId, tokens]);

  // Count non-null fields in a section for progress indicator
  const countFilledFields = (fields: (string | number | boolean | null | undefined)[]): number => {
    return fields.filter(f => f !== null && f !== undefined && f !== '').length;
  };

  if (loading) {
    if (compact) {
      return (
        <div className="d-flex justify-content-center align-items-center py-4">
          <CSpinner size="sm" className="me-2" />
          <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>Loading...</span>
        </div>
      );
    }
    return (
      <CCard className="studio-card">
        <CCardHeader className="studio-card-header">
          <span className="fw-semibold">Physical Description</span>
        </CCardHeader>
        <CCardBody className="studio-card-body d-flex justify-content-center align-items-center py-5">
          <CSpinner size="sm" className="me-2" />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Loading property details...</span>
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    if (compact) {
      return (
        <div className="p-3">
          <div className="text-danger" style={{ fontSize: '0.875rem' }}>{error}</div>
        </div>
      );
    }
    return (
      <CCard className="studio-card">
        <CCardHeader className="studio-card-header">
          <span className="fw-semibold">Physical Description</span>
        </CCardHeader>
        <CCardBody className="studio-card-body">
          <div className="studio-text-error">{error}</div>
        </CCardBody>
      </CCard>
    );
  }

  if (!propertyData) {
    return null;
  }

  // Check if a field should be visible
  const shouldShowField = (sectionKey: string, value: string | number | boolean | null | undefined): boolean => {
    const showAll = showAllFields[sectionKey];
    return showAll || isPopulated(value);
  };

  // Helper to conditionally render a field row
  const renderField = (
    sectionKey: string,
    label: string,
    value: string | number | boolean | null | undefined,
    fieldKey: string,
    options?: {
      format?: 'number' | 'currency' | 'rating' | 'boolean' | 'text';
      inputType?: 'text' | 'number' | 'select';
      suffix?: string;
    }
  ) => {
    if (!shouldShowField(sectionKey, value)) {
      return null;
    }
    return (
      <EditableFieldRow
        label={label}
        value={value}
        fieldKey={fieldKey}
        onSave={handleFieldSave}
        format={options?.format}
        inputType={options?.inputType}
        suffix={options?.suffix}
      />
    );
  };

  // Define sections with their fields for progress tracking
  const sections = [
    {
      key: SECTION_KEYS.PROPERTY_ID,
      title: 'Property Identification',
      fields: [
        propertyData.propertyName,
        propertyData.streetAddress,
        propertyData.city,
        propertyData.state,
        propertyData.zipCode,
        propertyData.market,
        propertyData.submarket,
        propertyData.county,
        propertyData.apnPrimary,
        propertyData.apnSecondary,
      ],
      total: 10,
    },
    {
      key: SECTION_KEYS.SITE,
      title: 'Site Characteristics',
      fields: [
        propertyData.lotSizeAcres,
        propertyData.lotSizeSF,
        propertyData.currentZoning,
        propertyData.proposedZoning,
        propertyData.floodZone,
        propertyData.topography,
        propertyData.siteShape,
        propertyData.siteUtilityRating,
        propertyData.locationRating,
        propertyData.accessRating,
        propertyData.visibilityRating,
      ],
      total: 11,
    },
    {
      key: SECTION_KEYS.BUILDING,
      title: 'Building Characteristics',
      fields: [
        propertyData.totalUnits,
        propertyData.netRentableArea,
        propertyData.grossSF,
        propertyData.buildingCount,
        propertyData.stories,
        propertyData.yearBuilt,
        propertyData.constructionType,
        propertyData.constructionClass,
        propertyData.propertyClass,
        propertyData.landToBuildingRatio,
      ],
      total: 10,
    },
    {
      key: SECTION_KEYS.PARKING,
      title: 'Parking & Access',
      fields: [
        propertyData.parkingSpaces,
        propertyData.parkingRatio,
        propertyData.parkingType,
      ],
      total: 3,
    },
    {
      key: SECTION_KEYS.CONDITION,
      title: 'Condition & Quality',
      fields: [
        propertyData.effectiveAge,
        propertyData.remainingEconomicLife,
        propertyData.totalEconomicLife,
        propertyData.conditionRating,
        propertyData.qualityRating,
      ],
      total: 5,
    },
    {
      key: SECTION_KEYS.LOCATION,
      title: 'Walkability Scores',
      fields: [
        propertyData.walkScore,
        propertyData.bikeScore,
        propertyData.transitScore,
      ],
      total: 3,
    },
  ];

  // Calculate overall completion
  const totalFields = sections.reduce((sum, s) => sum + s.total, 0);
  const filledFields = sections.reduce((sum, s) => sum + countFilledFields(s.fields), 0);
  const completionPct = Math.round((filledFields / totalFields) * 100);

  // Compact mode helper - renders a field in single column layout
  const renderCompactField = (
    sectionKey: string,
    label: string,
    value: string | number | boolean | null | undefined,
    fieldKey: string,
    options?: {
      format?: 'number' | 'currency' | 'rating' | 'boolean' | 'text';
      inputType?: 'text' | 'number' | 'select';
      suffix?: string;
    }
  ) => {
    if (!shouldShowField(sectionKey, value)) {
      return null;
    }
    return (
      <EditableFieldRow
        label={label}
        value={value}
        fieldKey={fieldKey}
        onSave={handleFieldSave}
        format={options?.format}
        inputType={options?.inputType}
        suffix={options?.suffix}
      />
    );
  };

  // Compact mode render - accordion sections without outer card
  if (compact) {
    return (
      <div className="physical-description-compact">
        {/* Section A: Property Identification */}
        <div style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ background: 'var(--cui-tertiary-bg)', padding: '0.375rem 0.5rem' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Property Identification</span>
            <SectionProgress
              filled={countFilledFields(sections[0].fields)}
              total={sections[0].total}
              showAll={showAllFields[SECTION_KEYS.PROPERTY_ID] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.PROPERTY_ID)}
            />
          </div>
          <div style={{ padding: '0.25rem 0.5rem' }}>
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'Property Name', propertyData.propertyName, 'propertyName')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'Street Address', propertyData.streetAddress, 'streetAddress')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'City', propertyData.city, 'city')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'State', propertyData.state, 'state')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'ZIP', propertyData.zipCode, 'zipCode')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'Market (MSA)', propertyData.market, 'market')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'Submarket', propertyData.submarket, 'submarket')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'County', propertyData.county, 'county')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'APN (Primary)', propertyData.apnPrimary, 'apnPrimary')}
            {renderCompactField(SECTION_KEYS.PROPERTY_ID, 'APN (Secondary)', propertyData.apnSecondary, 'apnSecondary')}
          </div>
        </div>

        {/* Section B: Site Characteristics */}
        <div style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ background: 'var(--cui-tertiary-bg)', padding: '0.375rem 0.5rem' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Site Characteristics</span>
            <SectionProgress
              filled={countFilledFields(sections[1].fields)}
              total={sections[1].total}
              showAll={showAllFields[SECTION_KEYS.SITE] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.SITE)}
            />
          </div>
          <div style={{ padding: '0.25rem 0.5rem' }}>
            {renderCompactField(SECTION_KEYS.SITE, 'Lot Size (Acres)', propertyData.lotSizeAcres, 'lotSizeAcres', { format: 'number', inputType: 'number', suffix: ' ac' })}
            {renderCompactField(SECTION_KEYS.SITE, 'Lot Size (SF)', propertyData.lotSizeSF, 'lotSizeSF', { format: 'number', inputType: 'number', suffix: ' SF' })}
            {renderCompactField(SECTION_KEYS.SITE, 'Current Zoning', propertyData.currentZoning, 'currentZoning')}
            {renderCompactField(SECTION_KEYS.SITE, 'Proposed Zoning', propertyData.proposedZoning, 'proposedZoning')}
            {renderCompactField(SECTION_KEYS.SITE, 'Flood Zone', propertyData.floodZone, 'floodZone')}
            {renderCompactField(SECTION_KEYS.SITE, 'Topography', propertyData.topography, 'topography')}
            {renderCompactField(SECTION_KEYS.SITE, 'Site Shape', propertyData.siteShape, 'siteShape')}
            {(showAllFields[SECTION_KEYS.SITE] || isPopulated(propertyData.siteUtilityRating) || isPopulated(propertyData.locationRating) || isPopulated(propertyData.accessRating) || isPopulated(propertyData.visibilityRating)) && (
              <>
                {renderCompactField(SECTION_KEYS.SITE, 'Site Utility', propertyData.siteUtilityRating, 'siteUtilityRating', { format: 'rating' })}
                {renderCompactField(SECTION_KEYS.SITE, 'Location Rating', propertyData.locationRating, 'locationRating', { format: 'rating' })}
                {renderCompactField(SECTION_KEYS.SITE, 'Access Rating', propertyData.accessRating, 'accessRating', { format: 'rating' })}
                {renderCompactField(SECTION_KEYS.SITE, 'Visibility Rating', propertyData.visibilityRating, 'visibilityRating', { format: 'rating' })}
              </>
            )}
          </div>
        </div>

        {/* Section C: Building Characteristics */}
        <div style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ background: 'var(--cui-tertiary-bg)', padding: '0.375rem 0.5rem' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Building Characteristics</span>
            <SectionProgress
              filled={countFilledFields(sections[2].fields)}
              total={sections[2].total}
              showAll={showAllFields[SECTION_KEYS.BUILDING] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.BUILDING)}
            />
          </div>
          <div style={{ padding: '0.25rem 0.5rem' }}>
            {renderCompactField(SECTION_KEYS.BUILDING, 'Total Units', propertyData.totalUnits, 'totalUnits', { format: 'number', inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Buildings', propertyData.buildingCount, 'buildingCount', { format: 'number', inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Net Rentable SF', propertyData.netRentableArea, 'netRentableArea', { format: 'number', inputType: 'number', suffix: ' SF' })}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Gross Building SF', propertyData.grossSF, 'grossSF', { format: 'number', inputType: 'number', suffix: ' SF' })}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Stories', propertyData.stories, 'stories', { format: 'number', inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Year Built', propertyData.yearBuilt, 'yearBuilt', { inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Construction Type', propertyData.constructionType, 'constructionType')}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Construction Class', propertyData.constructionClass, 'constructionClass')}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Building Class', propertyData.propertyClass, 'propertyClass')}
            {renderCompactField(SECTION_KEYS.BUILDING, 'Land:Building Ratio', propertyData.landToBuildingRatio, 'landToBuildingRatio', { format: 'number', inputType: 'number', suffix: ':1' })}
          </div>
        </div>

        {/* Section D: Parking & Access */}
        <div style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ background: 'var(--cui-tertiary-bg)', padding: '0.375rem 0.5rem' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Parking & Access</span>
            <SectionProgress
              filled={countFilledFields(sections[3].fields)}
              total={sections[3].total}
              showAll={showAllFields[SECTION_KEYS.PARKING] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.PARKING)}
            />
          </div>
          <div style={{ padding: '0.25rem 0.5rem' }}>
            {renderCompactField(SECTION_KEYS.PARKING, 'Total Parking Spaces', propertyData.parkingSpaces, 'parkingSpaces', { format: 'number', inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.PARKING, 'Parking Ratio', propertyData.parkingRatio, 'parkingRatio', { format: 'number', inputType: 'number', suffix: ' spaces/unit' })}
            {renderCompactField(SECTION_KEYS.PARKING, 'Parking Type', propertyData.parkingType, 'parkingType')}
          </div>
        </div>

        {/* Section E: Condition & Quality */}
        <div style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ background: 'var(--cui-tertiary-bg)', padding: '0.375rem 0.5rem' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Condition & Quality</span>
            <SectionProgress
              filled={countFilledFields(sections[4].fields)}
              total={sections[4].total}
              showAll={showAllFields[SECTION_KEYS.CONDITION] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.CONDITION)}
            />
          </div>
          <div style={{ padding: '0.25rem 0.5rem' }}>
            {renderCompactField(SECTION_KEYS.CONDITION, 'Effective Age', propertyData.effectiveAge, 'effectiveAge', { format: 'number', inputType: 'number', suffix: ' years' })}
            {renderCompactField(SECTION_KEYS.CONDITION, 'Remaining Economic Life', propertyData.remainingEconomicLife, 'remainingEconomicLife', { format: 'number', inputType: 'number', suffix: ' years' })}
            {renderCompactField(SECTION_KEYS.CONDITION, 'Total Economic Life', propertyData.totalEconomicLife, 'totalEconomicLife', { format: 'number', inputType: 'number', suffix: ' years' })}
            {renderCompactField(SECTION_KEYS.CONDITION, 'Condition Rating', propertyData.conditionRating, 'conditionRating', { format: 'rating' })}
            {renderCompactField(SECTION_KEYS.CONDITION, 'Quality Rating', propertyData.qualityRating, 'qualityRating', { format: 'rating' })}
          </div>
        </div>

        {/* Section F: Walkability Scores */}
        <div>
          <div
            className="d-flex justify-content-between align-items-center"
            style={{ background: 'var(--cui-tertiary-bg)', padding: '0.375rem 0.5rem' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Walkability Scores</span>
            <SectionProgress
              filled={countFilledFields(sections[5].fields)}
              total={sections[5].total}
              showAll={showAllFields[SECTION_KEYS.LOCATION] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.LOCATION)}
            />
          </div>
          <div style={{ padding: '0.25rem 0.5rem' }}>
            {renderCompactField(SECTION_KEYS.LOCATION, 'Walk Score', propertyData.walkScore, 'walkScore', { format: 'number', inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.LOCATION, 'Bike Score', propertyData.bikeScore, 'bikeScore', { format: 'number', inputType: 'number' })}
            {renderCompactField(SECTION_KEYS.LOCATION, 'Transit Score', propertyData.transitScore, 'transitScore', { format: 'number', inputType: 'number' })}
          </div>
        </div>
      </div>
    );
  }

  // Standard (non-compact) mode render
  return (
    <CCard className="studio-card physical-description">
      <CCardHeader className="studio-card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">Physical Description</span>
          <CBadge
            color={completionPct >= 80 ? 'success' : completionPct >= 50 ? 'warning' : 'secondary'}
            style={{ fontSize: '0.7rem' }}
          >
            {completionPct}% complete
          </CBadge>
        </div>
        <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
          {filledFields}/{totalFields} fields
        </span>
      </CCardHeader>
      <CCardBody className="studio-card-body p-2 pt-3">
        {/* Section A: Property Identification */}
        <div className="physical-section" style={{ marginBottom: '0.5rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-3" style={{ background: 'var(--cui-tertiary-bg)', margin: '-0.5rem -0.5rem 0.75rem -0.5rem', padding: '0.75rem 1rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Property Identification</span>
            <SectionProgress
              filled={countFilledFields(sections[0].fields)}
              total={sections[0].total}
              showAll={showAllFields[SECTION_KEYS.PROPERTY_ID] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.PROPERTY_ID)}
            />
          </div>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'Property Name', propertyData.propertyName, 'propertyName')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'Street Address', propertyData.streetAddress, 'streetAddress')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'City', propertyData.city, 'city')}
            </CCol>
            <CCol xs={3}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'State', propertyData.state, 'state')}
            </CCol>
            <CCol xs={3}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'ZIP', propertyData.zipCode, 'zipCode')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'Market (MSA)', propertyData.market, 'market')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'Submarket', propertyData.submarket, 'submarket')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'County', propertyData.county, 'county')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'APN (Primary)', propertyData.apnPrimary, 'apnPrimary')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PROPERTY_ID, 'APN (Secondary)', propertyData.apnSecondary, 'apnSecondary')}
            </CCol>
          </CRow>
        </div>

        {/* Section B: Site Characteristics */}
        <div className="physical-section" style={{ marginBottom: '0.5rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-3" style={{ background: 'var(--cui-tertiary-bg)', margin: '-0.5rem -0.5rem 0.75rem -0.5rem', padding: '0.75rem 1rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Site Characteristics</span>
            <SectionProgress
              filled={countFilledFields(sections[1].fields)}
              total={sections[1].total}
              showAll={showAllFields[SECTION_KEYS.SITE] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.SITE)}
            />
          </div>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Lot Size (Acres)', propertyData.lotSizeAcres, 'lotSizeAcres', { format: 'number', inputType: 'number', suffix: ' ac' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Lot Size (SF)', propertyData.lotSizeSF, 'lotSizeSF', { format: 'number', inputType: 'number', suffix: ' SF' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Current Zoning', propertyData.currentZoning, 'currentZoning')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Proposed Zoning', propertyData.proposedZoning, 'proposedZoning')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Flood Zone', propertyData.floodZone, 'floodZone')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Topography', propertyData.topography, 'topography')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.SITE, 'Site Shape', propertyData.siteShape, 'siteShape')}
            </CCol>
          </CRow>
          {/* Site Ratings */}
          {(showAllFields[SECTION_KEYS.SITE] || isPopulated(propertyData.siteUtilityRating) || isPopulated(propertyData.locationRating) || isPopulated(propertyData.accessRating) || isPopulated(propertyData.visibilityRating)) && (
            <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
              <div className="mb-2" style={{ color: 'var(--cui-body-color)', fontSize: '0.85rem', fontWeight: 600 }}>
                Site Ratings
              </div>
              <CRow>
                <CCol xs={6}>
                  {renderField(SECTION_KEYS.SITE, 'Site Utility', propertyData.siteUtilityRating, 'siteUtilityRating', { format: 'rating' })}
                </CCol>
                <CCol xs={6}>
                  {renderField(SECTION_KEYS.SITE, 'Location', propertyData.locationRating, 'locationRating', { format: 'rating' })}
                </CCol>
              </CRow>
              <CRow>
                <CCol xs={6}>
                  {renderField(SECTION_KEYS.SITE, 'Access', propertyData.accessRating, 'accessRating', { format: 'rating' })}
                </CCol>
                <CCol xs={6}>
                  {renderField(SECTION_KEYS.SITE, 'Visibility', propertyData.visibilityRating, 'visibilityRating', { format: 'rating' })}
                </CCol>
              </CRow>
            </div>
          )}
        </div>

        {/* Section C: Building Characteristics */}
        <div className="physical-section" style={{ marginBottom: '0.5rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-3" style={{ background: 'var(--cui-tertiary-bg)', margin: '-0.5rem -0.5rem 0.75rem -0.5rem', padding: '0.75rem 1rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Building Characteristics</span>
            <SectionProgress
              filled={countFilledFields(sections[2].fields)}
              total={sections[2].total}
              showAll={showAllFields[SECTION_KEYS.BUILDING] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.BUILDING)}
            />
          </div>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Total Units', propertyData.totalUnits, 'totalUnits', { format: 'number', inputType: 'number' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Buildings', propertyData.buildingCount, 'buildingCount', { format: 'number', inputType: 'number' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Net Rentable SF', propertyData.netRentableArea, 'netRentableArea', { format: 'number', inputType: 'number', suffix: ' SF' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Gross Building SF', propertyData.grossSF, 'grossSF', { format: 'number', inputType: 'number', suffix: ' SF' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Stories', propertyData.stories, 'stories', { format: 'number', inputType: 'number' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Year Built', propertyData.yearBuilt, 'yearBuilt', { inputType: 'number' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Construction Type', propertyData.constructionType, 'constructionType')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Construction Class', propertyData.constructionClass, 'constructionClass')}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Building Class', propertyData.propertyClass, 'propertyClass')}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.BUILDING, 'Land to Building Ratio', propertyData.landToBuildingRatio, 'landToBuildingRatio', { format: 'number', inputType: 'number', suffix: ':1' })}
            </CCol>
          </CRow>
        </div>

        {/* Section D: Parking & Access */}
        <div className="physical-section" style={{ marginBottom: '0.5rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-3" style={{ background: 'var(--cui-tertiary-bg)', margin: '-0.5rem -0.5rem 0.75rem -0.5rem', padding: '0.75rem 1rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Parking & Access</span>
            <SectionProgress
              filled={countFilledFields(sections[3].fields)}
              total={sections[3].total}
              showAll={showAllFields[SECTION_KEYS.PARKING] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.PARKING)}
            />
          </div>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PARKING, 'Total Parking Spaces', propertyData.parkingSpaces, 'parkingSpaces', { format: 'number', inputType: 'number' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PARKING, 'Parking Ratio', propertyData.parkingRatio, 'parkingRatio', { format: 'number', inputType: 'number', suffix: ' spaces/unit' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.PARKING, 'Parking Type', propertyData.parkingType, 'parkingType')}
            </CCol>
          </CRow>
        </div>

        {/* Section E: Condition & Quality */}
        <div className="physical-section" style={{ marginBottom: '0.5rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-3" style={{ background: 'var(--cui-tertiary-bg)', margin: '-0.5rem -0.5rem 0.75rem -0.5rem', padding: '0.75rem 1rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Condition & Quality</span>
            <SectionProgress
              filled={countFilledFields(sections[4].fields)}
              total={sections[4].total}
              showAll={showAllFields[SECTION_KEYS.CONDITION] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.CONDITION)}
            />
          </div>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.CONDITION, 'Effective Age', propertyData.effectiveAge, 'effectiveAge', { format: 'number', inputType: 'number', suffix: ' years' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.CONDITION, 'Remaining Economic Life', propertyData.remainingEconomicLife, 'remainingEconomicLife', { format: 'number', inputType: 'number', suffix: ' years' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.CONDITION, 'Total Economic Life', propertyData.totalEconomicLife, 'totalEconomicLife', { format: 'number', inputType: 'number', suffix: ' years' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.CONDITION, 'Condition Rating', propertyData.conditionRating, 'conditionRating', { format: 'rating' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.CONDITION, 'Quality Rating', propertyData.qualityRating, 'qualityRating', { format: 'rating' })}
            </CCol>
          </CRow>
        </div>

        {/* Section F: Walkability Scores */}
        <div className="physical-section">
          <div className="d-flex justify-content-between align-items-center mb-3" style={{ background: 'var(--cui-tertiary-bg)', margin: '-0.5rem -0.5rem 0.75rem -0.5rem', padding: '0.75rem 1rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>Walkability Scores (0-100)</span>
            <SectionProgress
              filled={countFilledFields(sections[5].fields)}
              total={sections[5].total}
              showAll={showAllFields[SECTION_KEYS.LOCATION] || false}
              onToggle={() => toggleShowAll(SECTION_KEYS.LOCATION)}
            />
          </div>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.LOCATION, 'Walk Score', propertyData.walkScore, 'walkScore', { format: 'number', inputType: 'number' })}
            </CCol>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.LOCATION, 'Bike Score', propertyData.bikeScore, 'bikeScore', { format: 'number', inputType: 'number' })}
            </CCol>
          </CRow>
          <CRow>
            <CCol xs={6}>
              {renderField(SECTION_KEYS.LOCATION, 'Transit Score', propertyData.transitScore, 'transitScore', { format: 'number', inputType: 'number' })}
            </CCol>
          </CRow>
        </div>
      </CCardBody>
    </CCard>
  );
}
