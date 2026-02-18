/**
 * SalesComparisonApproach Component
 *
 * Main component for the Sales Comparison Approach valuation method
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SalesComparable, ValuationReconciliation } from '@/types/valuation';
import { ComparablesGrid } from './ComparablesGrid';
import { IndicatedValueSummary } from './IndicatedValueSummary';
// LandscaperChatPanel removed - redundant with main Landscaper panel which has tab-aware context
import ValuationSalesCompMap from '@/components/map/ValuationSalesCompMap';
import { LandscapeButton } from '@/components/ui/landscape';
import { SalesCompDetailModal } from './SalesCompDetailModal';
import { buildSubjectLocationFromProject } from '@/lib/valuation/subjectLocation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import {
  deleteSalesComparable,
} from '@/lib/api/valuation';

interface SalesComparisonApproachProps {
  projectId: number;
  comparables: SalesComparable[];
  reconciliation: ValuationReconciliation | null;
  onRefresh?: () => void;
  mode?: 'multifamily' | 'land'; // Field label mode for ComparablesGrid
}

interface ProjectDetails {
  street_address?: string;
  city?: string;
  state?: string;
  jurisdiction_city?: string;
  jurisdiction_state?: string;
  analysis_start_date?: string | null;
  total_units?: number;
  target_units?: number;
  gross_sf?: number;
  year_built?: number;
  ownership_type?: string;
  apn?: string | null;
  apn_primary?: string | null;
  apn_secondary?: string | null;
}

const IMPROVED_PROPERTY_TYPES = [
  'MULTIFAMILY', 'MF', 'OFFICE', 'OFF', 'RETAIL', 'RET',
  'INDUSTRIAL', 'IND', 'HOSPITALITY', 'HTL', 'SELF_STORAGE',
  'MANUFACTURED', 'SPECIALTY_HOUSING', 'MIXED_USE', 'MXU',
];

export function SalesComparisonApproach({
  projectId,
  comparables,
  reconciliation,
  onRefresh,
  mode = 'multifamily'
}: SalesComparisonApproachProps) {
  const displayComparables = useMemo(
    () => comparables.filter((comp) => {
      const pt = (comp.property_type ?? '').toUpperCase();
      return pt !== '' && pt !== 'LAND' && IMPROVED_PROPERTY_TYPES.includes(pt);
    }),
    [comparables]
  );
  const [showModal, setShowModal] = useState(false);
  const [editingComp, setEditingComp] = useState<SalesComparable | null>(null);
  const [subjectProperty, setSubjectProperty] = useState<{
    city?: string | null;
    analysisStartDate?: string | null;
    units?: number | null;
    buildingSf?: number | null;
    yearBuilt?: number | null;
    ownershipType?: string | null;
  } | null>(null);
  const [subjectApn, setSubjectApn] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { activeProject } = useProjectContext();
  const subjectLocation = useMemo(
    () => buildSubjectLocationFromProject(activeProject),
    [activeProject]
  );
  const subjectInfo = useMemo(() => ({
    name: activeProject?.project_name ?? 'Subject',
    address: activeProject?.street_address ?? '',
    city: subjectProperty?.city ?? activeProject?.jurisdiction_city ?? '',
    state: activeProject?.jurisdiction_state ?? '',
    lat: subjectLocation?.latitude,
    lng: subjectLocation?.longitude,
    yearBuilt: subjectProperty?.yearBuilt ?? undefined,
    units: subjectProperty?.units ?? undefined,
    buildingSf: subjectProperty?.buildingSf != null ? Number(subjectProperty.buildingSf) : undefined,
  }), [activeProject, subjectLocation, subjectProperty]);

  const compApns = useMemo(() => {
    const apns = displayComparables
      .map((comp) => {
        const extra = (comp.extra_data ?? {}) as Record<string, unknown>;
        const candidate =
          (comp as unknown as Record<string, unknown>).apn ||
          (comp as unknown as Record<string, unknown>).parcel_apn ||
          extra.apn ||
          extra.apn_primary ||
          extra.parcel_apn ||
          extra.ain;
        return typeof candidate === 'string' ? candidate.trim() : '';
      })
      .filter(Boolean);
    return apns.length ? apns : undefined;
  }, [displayComparables]);

  useEffect(() => {
    let active = true;
    const loadSubjectDetails = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/details`);
        if (response.ok) {
          const details = (await response.json()) as ProjectDetails;
          if (!active) return;
          setSubjectProperty({
            city: details.city ?? details.jurisdiction_city ?? activeProject?.jurisdiction_city ?? null,
            analysisStartDate: details.analysis_start_date ?? null,
            units: details.total_units ?? details.target_units ?? activeProject?.total_residential_units ?? null,
            buildingSf: details.gross_sf ?? activeProject?.total_commercial_sqft ?? null,
            yearBuilt: details.year_built ?? null,
            ownershipType: details.ownership_type ?? null
          });
          const apnCandidate = (details.apn_primary || details.apn || details.apn_secondary || '').trim();
          setSubjectApn(apnCandidate.length > 0 ? apnCandidate : null);
          return;
        }
      } catch (error) {
        console.error('Failed to load subject property details:', error);
      }

      if (!active) return;
      setSubjectProperty({
        city: activeProject?.jurisdiction_city ?? null,
        analysisStartDate: null,
        units: activeProject?.total_residential_units ?? null,
        buildingSf: activeProject?.total_commercial_sqft ?? null,
        yearBuilt: null,
        ownershipType: null
      });
      setSubjectApn(null);
    };

    loadSubjectDetails();
    return () => {
      active = false;
    };
  }, [activeProject, projectId]);

  const handleEditComp = (comp: SalesComparable) => {
    setEditingComp(comp);
    setShowModal(true);
  };

  const handleDeleteComp = async (compId: number) => {
    if (!confirm('Are you sure you want to delete this comparable? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteSalesComparable(projectId, compId);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting comparable:', error);
      alert(`Error deleting comparable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddComp = () => {
    setEditingComp(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingComp(null);
  };

  const handleSaved = () => {
    onRefresh?.();
  };

  // Determine layout based on number of comps
  // If more than 5 comps: Map goes above grid (full width)
  // If 5 or fewer comps: Map goes in sidebar (right side)
  const showMapAbove = displayComparables.length > 5;

  return (
    <div className="d-flex flex-column" style={{ gap: '1.5rem' }}>
      <SalesCompDetailModal
        projectId={projectId}
        comparableId={editingComp?.comparable_id}
        propertyType={editingComp?.property_type ?? 'MULTIFAMILY'}
        isOpen={showModal}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        compNumber={editingComp
          ? (editingComp.comp_number ?? displayComparables.indexOf(editingComp) + 1)
          : displayComparables.length + 1
        }
        allComparables={displayComparables}
        subjectLocation={subjectLocation}
        subjectProperty={subjectInfo}
      />

      {/* Map Above Grid (when more than 5 comps) */}
      {displayComparables.length > 0 && showMapAbove && (
        <ValuationSalesCompMap
          projectId={projectId.toString()}
          styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
          height="500px"
          subjectApn={subjectApn ?? undefined}
          compApns={compApns}
        />
      )}

      {/* Main Layout: Grid + Sidebar or Full Width */}
      {displayComparables.length === 0 ? (
        <div
          className="text-center rounded border"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)',
            padding: '3rem 1rem',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏢</div>
          <h3
            className="fs-5 fw-semibold mb-2"
            style={{ color: 'var(--cui-body-color)' }}
          >
            No Comparables Yet
          </h3>
          <p
            className="small mb-3"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Add comparable sales to begin the valuation analysis
          </p>
          <LandscapeButton
            color="primary"
            size="sm"
            onClick={handleAddComp}
          >
            Add First Comparable
          </LandscapeButton>
        </div>
      ) : (
        <>
          {/* Top Section: Grid + Map (side by side when 5 or fewer comps) */}
          <div className={showMapAbove ? "d-flex flex-column" : "d-grid"} style={showMapAbove ? { gap: '1.5rem' } : { gridTemplateColumns: 'auto 1fr', alignItems: 'stretch', gap: '1.5rem' }}>
            {/* Main Content - Grid */}
            <div ref={gridRef}>
                <ComparablesGrid
                comparables={displayComparables}
                projectId={projectId}
                subjectProperty={subjectProperty ?? undefined}
                onEdit={handleEditComp}
                onDelete={handleDeleteComp}
                onRefresh={onRefresh}
                onAddComp={handleAddComp}
                mode={mode}
              />
            </div>

            {/* Sidebar - Map (when 5 or fewer comps) - Same height as grid */}
            {!showMapAbove && (
              <ValuationSalesCompMap
                projectId={projectId.toString()}
                styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
                height="100%"
                subjectApn={subjectApn ?? undefined}
                compApns={compApns}
              />
            )}
          </div>

          {/* Bottom Section: Indicated Value Summary - Full width (Landscaper panel on left handles valuation questions) */}
          <div>
            <IndicatedValueSummary
              comparables={displayComparables}
              reconciliation={reconciliation}
              subjectUnits={113}
              projectId={projectId}
            />
          </div>
        </>
      )}
    </div>
  );
}
