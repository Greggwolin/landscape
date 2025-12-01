/**
 * Project Costs Report Component
 *
 * Displays project cost data in a tabular format with collapsible sections.
 * Each section can be expanded/collapsed by clicking the section header.
 */

'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CAlert, CTable, CBadge, CButton } from '@coreui/react';
import useSWR from 'swr';
import type {
  PhaseData,
  ValidationReportResponse,
} from '@/types/validation-report';
import {
  formatValidationCurrency,
  formatValidationPercent,
  formatValidationNumber,
} from '@/types/validation-report';
import { useContainers } from '@/hooks/useContainers';
import { useProjectConfig } from '@/hooks/useProjectConfig';
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection';
import { exportProjectCostsToExcel } from '@/lib/exports/projectCostsExcel';

interface Props {
  projectId: number;
}

// Indentation levels (in pixels) - standardized
const INDENT = {
  SECTION_HEADER: 12,  // Section headers (same level as Phase ID column padding)
  LINE_ITEM: 24,       // Individual line items (2 spaces = 12px more)
  TOTAL: 36,           // Totals (additional 2 spaces = 12px more)
};

// Section IDs for accordion state
type SectionId =
  | 'physical'
  | 'revenue'
  | 'combined-revenue'
  | 'schedule'
  | 'budget'
  | 'cost-totals'
  | 'profit';

// ============================================================================
// FETCHER
// ============================================================================

async function fetchValidationReport(url: string): Promise<ValidationReportResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to load validation report');
  }
  return res.json();
}

// ============================================================================
// TABLE ROW HELPERS
// ============================================================================

type IndentLevel = 'none' | 'line_item' | 'total';

interface DataRowProps {
  label: string;
  phases: PhaseData[];
  totals: PhaseData;
  getValue: (phase: PhaseData) => number;
  format?: 'currency' | 'number' | 'percent';
  decimals?: number;
  highlight?: boolean;
  indent?: IndentLevel;
  textColor?: string;
  topBorder?: boolean; // Add thick top border to separate use types
}

function DataRow({
  label,
  phases,
  totals,
  getValue,
  format = 'currency',
  decimals = 0,
  highlight = false,
  indent = 'none',
  textColor,
  topBorder = false,
}: DataRowProps) {
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return formatValidationCurrency(value);
      case 'percent':
        return formatValidationPercent(value);
      case 'number':
        return formatValidationNumber(value, decimals);
      default:
        return String(value);
    }
  };

  const rowStyle: React.CSSProperties = {
    ...(highlight ? { backgroundColor: 'var(--cui-tertiary-bg)', fontWeight: 600 } : {}),
    ...(topBorder ? { borderTop: '2px solid var(--cui-border-color)' } : {}),
  };

  // Determine padding based on indent level
  // Totals get the deepest indent, line items get standard indent
  const getPaddingLeft = (): number => {
    if (highlight) return INDENT.TOTAL;  // Totals always get deepest indent
    if (indent === 'line_item') return INDENT.LINE_ITEM;
    if (indent === 'total') return INDENT.TOTAL;
    return INDENT.SECTION_HEADER;  // Default: same as section header
  };

  const labelStyle: React.CSSProperties = { paddingLeft: `${getPaddingLeft()}px` };

  return (
    <tr style={rowStyle}>
      <td
        style={{
          ...labelStyle,
          fontWeight: highlight ? 600 : 400,
          whiteSpace: 'nowrap',
          borderRight: '2px solid var(--cui-border-color)',
        }}
      >
        {label}
      </td>
      {phases.map((phase, idx) => (
        <td
          key={idx}
          style={{
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            color: getValue(phase) < 0 ? 'var(--cui-danger)' : textColor,
          }}
        >
          {formatValue(getValue(phase))}
        </td>
      ))}
      <td
        style={{
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          backgroundColor: 'var(--cui-light-bg-subtle)',
          borderLeft: '2px solid var(--cui-border-color)',
          color: getValue(totals) < 0 ? 'var(--cui-danger)' : textColor,
        }}
      >
        {formatValue(getValue(totals))}
      </td>
    </tr>
  );
}

// Section header row with accordion toggle
interface SectionHeaderProps {
  title: string;
  colSpan: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function SectionHeader({ title, colSpan, isExpanded, onToggle }: SectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        onClick={onToggle}
        style={{
          backgroundColor: 'var(--cui-dark-bg-subtle)',
          fontWeight: 700,
          fontSize: '0.8125rem',
          padding: `8px ${INDENT.SECTION_HEADER}px`,
          borderTop: '2px solid var(--cui-border-color)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ marginRight: '8px', display: 'inline-block', width: '12px' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
        {title}
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Default column widths
const DEFAULT_LABEL_WIDTH = 200;
const DEFAULT_DATA_WIDTH = 110;

// All sections expanded by default
const ALL_SECTIONS: SectionId[] = [
  'physical',
  'revenue',
  'combined-revenue',
  'schedule',
  'budget',
  'cost-totals',
  'profit',
];

export default function ValidationReport({ projectId }: Props) {
  const { data, error, isLoading } = useSWR<ValidationReportResponse>(
    `/api/projects/${projectId}/validation-report`,
    fetchValidationReport,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Fetch containers (areas/phases) for filter
  const { areas, phases: containerPhases, isLoading: containersLoading } = useContainers({ projectId });
  const { labels } = useProjectConfig(projectId);

  // State for filter selections
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>([]);

  // State for resizable columns
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  // State for accordion sections - all expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(ALL_SECTIONS));

  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSectionExpanded = (sectionId: SectionId) => expandedSections.has(sectionId);

  // Initialize column widths when data loads
  const initColumnWidths = useCallback((phaseCount: number) => {
    if (columnWidths.length === 0) {
      // First column (labels) + phase columns + total column
      const widths = [DEFAULT_LABEL_WIDTH];
      for (let i = 0; i < phaseCount; i++) {
        widths.push(DEFAULT_DATA_WIDTH);
      }
      widths.push(DEFAULT_DATA_WIDTH); // Total column
      setColumnWidths(widths);
    }
  }, [columnWidths.length]);

  // Handle mouse down on resize handle
  const handleResizeStart = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    resizingRef.current = {
      colIndex,
      startX: e.clientX,
      startWidth: columnWidths[colIndex] || DEFAULT_DATA_WIDTH,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(60, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => {
        const updated = [...prev];
        updated[resizingRef.current!.colIndex] = newWidth;
        return updated;
      });
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Filter handlers
  const handleAreaSelect = useCallback((areaId: number) => {
    setSelectedAreaIds(prev => {
      if (prev.includes(areaId)) {
        return prev.filter(id => id !== areaId);
      }
      return [...prev, areaId];
    });
    // Clear phase selections when area changes
    setSelectedPhaseIds([]);
  }, []);

  const handlePhaseSelect = useCallback((phaseId: number) => {
    setSelectedPhaseIds(prev => {
      if (prev.includes(phaseId)) {
        return prev.filter(id => id !== phaseId);
      }
      return [...prev, phaseId];
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedAreaIds([]);
    setSelectedPhaseIds([]);
  }, []);

  // Filter phases shown in tiles by selected areas
  const filteredContainerPhases = useMemo(() => {
    if (selectedAreaIds.length === 0) return containerPhases;
    return containerPhases.filter(phase => selectedAreaIds.includes(phase.parent_id!));
  }, [containerPhases, selectedAreaIds]);

  const hasFilters = selectedAreaIds.length > 0 || selectedPhaseIds.length > 0;

  // Extract data from response (used in memos below, must be before early returns)
  const allPhases = useMemo(() => data?.data?.phases ?? [], [data?.data?.phases]);
  const totals = data?.data?.totals;

  // Create mapping from phase name to container phase_id for filtering
  // Phase names in data are like "1.1", "1.2", etc.
  const phaseNameToContainerId = useMemo(() => {
    const map = new Map<string, number>();
    containerPhases.forEach(cp => {
      // Container phase names might be "1.1" or just the name
      map.set(cp.name, cp.division_id);
    });
    return map;
  }, [containerPhases]);

  // Filter phases based on selection
  const phases = useMemo(() => {
    if (selectedPhaseIds.length === 0 && selectedAreaIds.length === 0) {
      return allPhases;
    }

    return allPhases.filter(phase => {
      const containerId = phaseNameToContainerId.get(phase.phaseName);
      if (!containerId) return true; // Show phases we can't map

      // If specific phases are selected, only show those
      if (selectedPhaseIds.length > 0) {
        return selectedPhaseIds.includes(containerId);
      }

      // If areas are selected but no specific phases, show phases in those areas
      if (selectedAreaIds.length > 0) {
        const containerPhase = containerPhases.find(cp => cp.division_id === containerId);
        return containerPhase && selectedAreaIds.includes(containerPhase.parent_id!);
      }

      return true;
    });
  }, [allPhases, selectedPhaseIds, selectedAreaIds, phaseNameToContainerId, containerPhases]);

  // Recalculate totals for filtered phases
  const filteredTotals = useMemo(() => {
    if (!totals || phases.length === allPhases.length) return totals;

    // Sum up values from filtered phases
    const newTotals: PhaseData = {
      phaseId: 0,
      phaseName: 'TOTAL',
      acres: 0,
      lots: 0,
      parcels: 0,
      frontFeet: 0,
      pricePerFrontFoot: 0,
      grossRevenue: 0,
      grossRevenuePerLot: 0,
      commissions: 0,
      closingCostsTotal: 0,
      closingCostsPerLot: 0,
      netRevenue: 0,
      netRevenuePerLot: 0,
      monthsToFirstSale: 0,
      totalMonthsToSell: 0,
      acquisition: 0,
      planningEngineering: 0,
      development: 0,
      operations: 0,
      contingency: 0,
      financing: 0,
      totalCosts: 0,
      costPerLot: 0,
      grossProfit: 0,
      profitMargin: 0,
      otherLandAcres: 0,
      otherLandUnits: 0,
      otherLandGrossRevenue: 0,
      otherLandNetRevenue: 0,
      otherLandByType: [],
      totalGrossRevenue: 0,
      subdivisionCost: 0,
      grossSaleProceeds: 0,
      totalNetRevenue: 0,
    };

    phases.forEach(p => {
      newTotals.acres += p.acres;
      newTotals.lots += p.lots;
      newTotals.parcels += p.parcels;
      newTotals.frontFeet += p.frontFeet;
      newTotals.grossRevenue += p.grossRevenue;
      newTotals.commissions += p.commissions;
      newTotals.closingCostsTotal += p.closingCostsTotal;
      newTotals.netRevenue += p.netRevenue;
      newTotals.acquisition += p.acquisition;
      newTotals.planningEngineering += p.planningEngineering;
      newTotals.development += p.development;
      newTotals.operations += p.operations;
      newTotals.contingency += p.contingency;
      newTotals.financing += p.financing;
      newTotals.totalCosts += p.totalCosts;
      newTotals.grossProfit += p.grossProfit;
      newTotals.otherLandAcres += p.otherLandAcres;
      newTotals.otherLandUnits += p.otherLandUnits;
      newTotals.otherLandGrossRevenue += p.otherLandGrossRevenue;
      newTotals.otherLandNetRevenue += p.otherLandNetRevenue;
      newTotals.totalGrossRevenue += p.totalGrossRevenue;
      newTotals.subdivisionCost += p.subdivisionCost;
      newTotals.grossSaleProceeds += p.grossSaleProceeds;
      newTotals.totalNetRevenue += p.totalNetRevenue;
    });

    // Calculate derived values
    newTotals.pricePerFrontFoot = newTotals.frontFeet > 0 ? newTotals.grossRevenue / newTotals.frontFeet : 0;
    newTotals.grossRevenuePerLot = newTotals.lots > 0 ? newTotals.grossRevenue / newTotals.lots : 0;
    newTotals.closingCostsPerLot = newTotals.lots > 0 ? newTotals.closingCostsTotal / newTotals.lots : 0;
    newTotals.netRevenuePerLot = newTotals.lots > 0 ? newTotals.netRevenue / newTotals.lots : 0;
    newTotals.costPerLot = newTotals.lots > 0 ? newTotals.totalCosts / newTotals.lots : 0;
    newTotals.profitMargin = newTotals.totalGrossRevenue > 0 ? newTotals.grossProfit / newTotals.totalGrossRevenue : 0;

    return newTotals;
  }, [phases, allPhases, totals]);

  // Export to Excel handler - must be after phases and filteredTotals are defined
  const handleExportExcel = useCallback(() => {
    if (!data?.data || !filteredTotals) return;

    exportProjectCostsToExcel({
      projectName: data.data.projectName,
      generatedAt: data.data.generatedAt,
      phases,
      totals: filteredTotals,
      level2Label: labels.level2Label,
    });
  }, [data?.data, phases, filteredTotals, labels.level2Label]);

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <CSpinner color="primary" className="mb-3" />
        <p style={{ color: 'var(--cui-secondary-color)' }}>Loading project costs report...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error loading report:</strong> {error.message}
      </CAlert>
    );
  }

  // No data state
  if (!data?.data || !filteredTotals) {
    return (
      <CAlert color="warning">No data available for this project.</CAlert>
    );
  }

  const { projectName, generatedAt } = data.data;

  // Initialize column widths on first render with data
  if (columnWidths.length === 0 && phases.length > 0) {
    initColumnWidths(phases.length);
  }

  // Build header columns - first col is "Phase ID", others are "Phase X.X"
  const headerColumns = [`${labels.level2Label} ID`, ...phases.map((p) => `${labels.level2Label} ${p.phaseName}`), 'TOTAL'];
  const colCount = headerColumns.length;

  // Get unique land use types across all phases for Other Land
  const allTypeCodes = new Set<string>();
  phases.forEach(p => p.otherLandByType?.forEach(t => allTypeCodes.add(t.typeCode)));
  filteredTotals.otherLandByType?.forEach(t => allTypeCodes.add(t.typeCode));
  const typeCodes = Array.from(allTypeCodes).sort();

  // Filter types that have revenue (exclude PARK, etc.)
  const typeCodesWithRevenue = typeCodes.filter(tc => {
    const typeTotal = filteredTotals.otherLandByType?.find(t => t.typeCode === tc);
    return typeTotal && typeTotal.grossRevenue > 0;
  });

  const tableStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    marginBottom: 0,
    tableLayout: 'fixed',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'var(--cui-dark-bg-subtle)',
    fontWeight: 600,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: '3px solid var(--cui-border-color)',
  };

  const resizeHandleStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '5px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Filter Header - Villages/Phases */}
      <CollapsibleSection
        title={`${labels.level1LabelPlural} / ${labels.level2LabelPlural}`}
        itemCount={1}
        defaultExpanded={false}
        headerActions={
          hasFilters && (
            <CBadge
              color="secondary"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
            >
              Clear Filters
            </CBadge>
          )
        }
      >
        <div className="p-3">
          {/* Areas (Level 1) */}
          <div className="mb-3">
            <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
              {labels.level1LabelPlural}
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {containersLoading ? (
                <div className="text-muted text-sm">Loading...</div>
              ) : areas.length === 0 ? (
                <div className="text-muted text-sm">No {labels.level1LabelPlural.toLowerCase()} defined</div>
              ) : (
                areas.map(area => {
                  const isSelected = selectedAreaIds.includes(area.division_id);
                  const cleanName = area.name.replace(/\bArea\b/gi, '').replace(/\s{2,}/g, ' ').trim();
                  return (
                    <button
                      key={area.division_id}
                      onClick={() => handleAreaSelect(area.division_id)}
                      className="px-3 py-2 rounded text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
                        color: isSelected ? '#fff' : 'var(--cui-body-color)',
                        border: `1px solid ${isSelected ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {labels.level1Label} {cleanName}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Phases (Level 2) */}
          <div>
            <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
              {labels.level2LabelPlural}
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {containersLoading ? (
                <div className="text-muted text-sm">Loading...</div>
              ) : filteredContainerPhases.length === 0 ? (
                <div className="text-muted text-sm">
                  No {labels.level2LabelPlural.toLowerCase()} {selectedAreaIds.length > 0 ? `in selected ${labels.level1LabelPlural.toLowerCase()}` : 'defined'}
                </div>
              ) : (
                filteredContainerPhases.map(phase => {
                  const isSelected = selectedPhaseIds.includes(phase.division_id);
                  const isHighlighted = !isSelected && selectedAreaIds.includes(phase.parent_id!);
                  return (
                    <button
                      key={phase.division_id}
                      onClick={() => handlePhaseSelect(phase.division_id)}
                      className="px-3 py-2 rounded text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--cui-primary)'
                          : isHighlighted
                          ? 'var(--cui-info-bg)'
                          : 'var(--cui-tertiary-bg)',
                        color: isSelected ? '#fff' : 'var(--cui-body-color)',
                        border: `1px solid ${isSelected ? 'var(--cui-primary)' : isHighlighted ? 'var(--cui-info)' : 'var(--cui-border-color)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {labels.level2Label} {phase.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Single unified table */}
      <CCard
        className="mt-3"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <CCardHeader
          className="d-flex justify-content-between align-items-center"
          style={{
            backgroundColor: 'var(--cui-dark-bg-subtle)',
            borderBottomColor: 'var(--cui-border-color)',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          <span>{projectName} - Project Costs Summary</span>
          <div className="d-flex align-items-center gap-3">
            <CButton
              color="primary"
              size="sm"
              onClick={handleExportExcel}
              style={{ fontWeight: 500 }}
            >
              Export to Excel
            </CButton>
            <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
              Generated: {new Date(generatedAt).toLocaleString()}
            </span>
          </div>
        </CCardHeader>
        <CCardBody className="p-0" style={{ maxHeight: '80vh', overflowX: 'auto', overflowY: 'auto' }}>
          <CTable small bordered hover style={tableStyle}>
            <colgroup>
              {headerColumns.map((_, idx) => (
                <col
                  key={idx}
                  style={{
                    width: columnWidths[idx] ? `${columnWidths[idx]}px` : (idx === 0 ? `${DEFAULT_LABEL_WIDTH}px` : `${DEFAULT_DATA_WIDTH}px`),
                  }}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                {headerColumns.map((col, idx) => (
                  <th
                    key={idx}
                    style={{
                      ...headerStyle,
                      textAlign: idx === 0 ? 'left' : 'center',
                      paddingLeft: idx === 0 ? `${INDENT.SECTION_HEADER}px` : undefined,
                      borderRight: idx === 0 ? '2px solid var(--cui-border-color)' : undefined,
                      borderLeft: idx === headerColumns.length - 1 ? '2px solid var(--cui-border-color)' : undefined,
                      position: 'relative',
                    }}
                  >
                    {col}
                    {/* Resize handle */}
                    <div
                      style={resizeHandleStyle}
                      onMouseDown={(e) => handleResizeStart(e, idx)}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'var(--cui-primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SECTION: Physical Metrics */}
              <SectionHeader
                title="Physical Metrics"
                colSpan={colCount}
                isExpanded={isSectionExpanded('physical')}
                onToggle={() => toggleSection('physical')}
              />
              {isSectionExpanded('physical') && (
                <>
                  {/* SFD Lots */}
                  <DataRow label="SFD Acres" phases={phases} totals={filteredTotals} getValue={(p) => p.acres} format="number" indent="line_item" />
                  <DataRow label="SFD Lots" phases={phases} totals={filteredTotals} getValue={(p) => p.lots} format="number" indent="line_item" />
                  <DataRow label="SFD Front Feet" phases={phases} totals={filteredTotals} getValue={(p) => p.frontFeet} format="number" indent="line_item" />

                  {/* Other Land (grouped by land use type) */}
                  {typeCodes.map((typeCode, idx) => {
                    const typeTotal = filteredTotals.otherLandByType?.find(t => t.typeCode === typeCode);
                    const hasUnits = typeTotal && typeTotal.units > 0;
                    const isFirst = idx === 0; // First other land type gets separator from SFD
                    return (
                      <React.Fragment key={typeCode}>
                        <DataRow
                          label={`${typeCode} Acres`}
                          phases={phases}
                          totals={filteredTotals}
                          getValue={(p) => p.otherLandByType?.find(t => t.typeCode === typeCode)?.acres || 0}
                          format="number"
                          indent="line_item"
                          topBorder={isFirst}
                        />
                        {hasUnits && (
                          <DataRow
                            label={`${typeCode} Units`}
                            phases={phases}
                            totals={filteredTotals}
                            getValue={(p) => p.otherLandByType?.find(t => t.typeCode === typeCode)?.units || 0}
                            format="number"
                            indent="line_item"
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {/* SECTION: Revenue */}
              <SectionHeader
                title="Revenue"
                colSpan={colCount}
                isExpanded={isSectionExpanded('revenue')}
                onToggle={() => toggleSection('revenue')}
              />
              {isSectionExpanded('revenue') && (
                <>
                  {/* SFD Revenue */}
                  <DataRow
                    label="SFD $/FF"
                    phases={phases}
                    totals={filteredTotals}
                    getValue={(p) => p.pricePerFrontFoot}
                    indent="line_item"
                    textColor="var(--validation-unit-price-color, #000)"
                  />
                  <DataRow
                    label="SFD $/Lot"
                    phases={phases}
                    totals={filteredTotals}
                    getValue={(p) => p.grossRevenuePerLot}
                    indent="line_item"
                    textColor="var(--validation-unit-price-color, #000)"
                  />
                  <DataRow label="SFD Gross Revenue" phases={phases} totals={filteredTotals} getValue={(p) => p.grossRevenue} indent="total" highlight />

                  {/* Other Land Revenue (grouped by land use type, only types with revenue) */}
                  {typeCodesWithRevenue.map((typeCode, idx) => (
                    <React.Fragment key={typeCode}>
                      <DataRow
                        label={`${typeCode} $/Unit`}
                        phases={phases}
                        totals={filteredTotals}
                        getValue={(p) => p.otherLandByType?.find(t => t.typeCode === typeCode)?.pricePerUnit || 0}
                        indent="line_item"
                        textColor="var(--validation-unit-price-color, #000)"
                        topBorder={idx === 0}
                      />
                      <DataRow
                        label={`${typeCode} Gross Revenue`}
                        phases={phases}
                        totals={filteredTotals}
                        getValue={(p) => p.otherLandByType?.find(t => t.typeCode === typeCode)?.grossRevenue || 0}
                        indent="total"
                        highlight
                      />
                    </React.Fragment>
                  ))}
                </>
              )}

              {/* SECTION: Combined Revenue */}
              <SectionHeader
                title="Combined Revenue"
                colSpan={colCount}
                isExpanded={isSectionExpanded('combined-revenue')}
                onToggle={() => toggleSection('combined-revenue')}
              />
              {isSectionExpanded('combined-revenue') && (
                <>
                  <DataRow label="Total Gross Revenue" phases={phases} totals={filteredTotals} getValue={(p) => p.totalGrossRevenue} highlight />
                  <DataRow label="Subdivision Cost" phases={phases} totals={filteredTotals} getValue={(p) => -p.subdivisionCost} indent="line_item" />
                  <DataRow label="Gross Sale Proceeds" phases={phases} totals={filteredTotals} getValue={(p) => p.grossSaleProceeds} highlight />
                  <DataRow label="Commissions" phases={phases} totals={filteredTotals} getValue={(p) => -p.commissions} indent="line_item" />
                  <DataRow label="Closing Costs Total" phases={phases} totals={filteredTotals} getValue={(p) => -p.closingCostsTotal} indent="line_item" />
                  <DataRow label="Net Revenue (SFD)" phases={phases} totals={filteredTotals} getValue={(p) => p.netRevenue} highlight />
                  <DataRow label="Net Revenue per Lot" phases={phases} totals={filteredTotals} getValue={(p) => p.netRevenuePerLot} />
                </>
              )}

              {/* SECTION: Schedule */}
              <SectionHeader
                title="Schedule"
                colSpan={colCount}
                isExpanded={isSectionExpanded('schedule')}
                onToggle={() => toggleSection('schedule')}
              />
              {isSectionExpanded('schedule') && (
                <>
                  <DataRow label="Months to First Sale" phases={phases} totals={filteredTotals} getValue={(p) => p.monthsToFirstSale} format="number" />
                  <DataRow label="Total Months to Sell" phases={phases} totals={filteredTotals} getValue={(p) => p.totalMonthsToSell} format="number" />
                </>
              )}

              {/* SECTION: Budget by Category */}
              <SectionHeader
                title="Budget by Category"
                colSpan={colCount}
                isExpanded={isSectionExpanded('budget')}
                onToggle={() => toggleSection('budget')}
              />
              {isSectionExpanded('budget') && (
                <>
                  <DataRow label="Acquisition" phases={phases} totals={filteredTotals} getValue={(p) => p.acquisition} indent="line_item" />
                  <DataRow label="Planning & Engineering" phases={phases} totals={filteredTotals} getValue={(p) => p.planningEngineering} indent="line_item" />
                  <DataRow label="Development" phases={phases} totals={filteredTotals} getValue={(p) => p.development} indent="line_item" />
                  <DataRow label="Operations" phases={phases} totals={filteredTotals} getValue={(p) => p.operations} indent="line_item" />
                  <DataRow label="Contingency" phases={phases} totals={filteredTotals} getValue={(p) => p.contingency} indent="line_item" />
                  <DataRow label="Financing" phases={phases} totals={filteredTotals} getValue={(p) => p.financing} indent="line_item" />
                </>
              )}

              {/* SECTION: Cost Totals */}
              <SectionHeader
                title="Cost Totals"
                colSpan={colCount}
                isExpanded={isSectionExpanded('cost-totals')}
                onToggle={() => toggleSection('cost-totals')}
              />
              {isSectionExpanded('cost-totals') && (
                <>
                  <DataRow label="Total Costs" phases={phases} totals={filteredTotals} getValue={(p) => p.totalCosts} highlight />
                  <DataRow label="Cost per Unit" phases={phases} totals={filteredTotals} getValue={(p) => p.costPerLot} />
                </>
              )}

              {/* SECTION: Profit Metrics */}
              <SectionHeader
                title="Profit Metrics"
                colSpan={colCount}
                isExpanded={isSectionExpanded('profit')}
                onToggle={() => toggleSection('profit')}
              />
              {isSectionExpanded('profit') && (
                <>
                  <DataRow label="Gross Profit" phases={phases} totals={filteredTotals} getValue={(p) => p.grossProfit} highlight />
                  <DataRow label="Profit Margin" phases={phases} totals={filteredTotals} getValue={(p) => p.profitMargin} format="percent" />
                </>
              )}
            </tbody>
          </CTable>
        </CCardBody>
      </CCard>
    </div>
  );
}
