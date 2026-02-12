'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ComparablesGrid } from '../ComparablesGrid';
import { ComparablesMap } from '../ComparablesMap';
import { SalesCompDetailModal } from '../SalesCompDetailModal';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { buildSubjectLocationFromProject } from '@/lib/valuation/subjectLocation';
import { deleteSalesComparable } from '@/lib/api/valuation';
import type { SalesComparable } from '@/types/valuation';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

interface LandValueSectionProps {
  comparables: SalesComparable[];
  loading: boolean;
  onRefresh?: () => void;
  projectId: number;
}

export function LandValueSection({ comparables, loading, onRefresh, projectId }: LandValueSectionProps) {
  const { activeProject } = useProjectContext();
  const subjectLocation = useMemo(
    () => buildSubjectLocationFromProject(activeProject),
    [activeProject]
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<SalesComparable | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const hasEntries = comparables.length > 0;

  const totalAcres = comparables.reduce(
    (sum, comp) => sum + (comp.land_area_acres ?? (comp.units != null ? Number(comp.units) : 0)),
    0
  );
  const avgPricePerSf = comparables.length
    ? comparables.reduce((sum, comp) => sum + (comp.price_per_sf ?? 0), 0) / comparables.length
    : 0;
  const totalLandSf = comparables.reduce((sum, comp) => {
    if (comp.land_area_sf != null) return sum + Number(comp.land_area_sf);
    if (comp.land_area_acres != null) return sum + (Number(comp.land_area_acres) * 43560);
    if (comp.units != null) return sum + (Number(comp.units) * 43560);
    return sum;
  }, 0);
  const indicatedValue = Math.round(
    avgPricePerSf * totalLandSf
  );

  const handleDeleteComp = useCallback(async (compId: number) => {
    try {
      await deleteSalesComparable(projectId, compId);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete land comparable:', err);
    }
  }, [projectId, onRefresh]);

  const handleEditComp = useCallback((comp: SalesComparable) => {
    setEditingComp(comp);
    setIsAddModalOpen(true);
  }, []);

  const subjectMapProperty = useMemo(() => {
    if (!subjectLocation) return undefined;
    return {
      latitude: subjectLocation.latitude,
      longitude: subjectLocation.longitude,
      name: activeProject?.project_name ?? 'Subject',
    };
  }, [subjectLocation, activeProject]);

  return (
    <div
      className="card"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <div
        className="card-header d-flex align-items-center justify-content-between"
        style={{ backgroundColor: 'var(--cui-card-header-bg)' }}
      >
        <div>
          <h5 className="mb-0" style={{ color: 'var(--cui-body-color)' }}>
            Land Value
          </h5>
          <small style={{ color: 'var(--cui-secondary-color)' }}>
            Comparable land sales and adjustments
          </small>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={onRefresh}
            className="btn btn-sm btn-outline-secondary"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="card-body p-0">
        {loading && !hasEntries && (
          <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
            Loading land comparables...
          </div>
        )}

        {!loading && !hasEntries && (
          <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
            <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.4 }}>🏗</div>
            <p className="mb-2">No land comparables yet.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              Add First Comparable
            </button>
          </div>
        )}

        {hasEntries && (
          <>
            {/* Grid + Map side-by-side — matches Sales Comparison tab layout */}
            <div
              className="d-grid"
              style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'stretch', gap: '1rem', padding: '1rem 1rem 0' }}
            >
              <div ref={gridRef}>
                <ComparablesGrid
                  comparables={comparables}
                  projectId={projectId}
                  onEdit={handleEditComp}
                  onDelete={handleDeleteComp}
                  onRefresh={onRefresh}
                  onAddComp={() => setIsAddModalOpen(true)}
                  mode="land"
                />
              </div>
              <div style={{ paddingBottom: '1rem' }}>
                <ComparablesMap
                  comparables={comparables}
                  height="100%"
                  subjectProperty={subjectMapProperty}
                />
              </div>
            </div>

            {/* Indicated Value Summary */}
            <div
              className="p-3"
              style={{ borderTop: '1px solid var(--cui-border-color)' }}
            >
              <div className="row g-3 small">
                <div className="col-4">
                  <div className="text-uppercase" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.7rem' }}>
                    Avg $/SF (Adjusted)
                  </div>
                  <div className="fs-5 fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {currencyFormatter.format(avgPricePerSf)}
                  </div>
                </div>
                <div className="col-4">
                  <div className="text-uppercase" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.7rem' }}>
                    Subject Land Acres
                  </div>
                  <div className="fs-5 fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {numberFormatter.format(totalAcres)}
                  </div>
                </div>
                <div className="col-4">
                  <div className="text-uppercase" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.7rem' }}>
                    Indicated Value
                  </div>
                  <div className="fs-5 fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {currencyFormatter.format(indicatedValue)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <SalesCompDetailModal
        projectId={projectId}
        comparableId={editingComp?.comparable_id}
        propertyType="LAND"
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingComp(null); }}
        onSaved={() => { onRefresh?.(); }}
        compNumber={editingComp
          ? (editingComp.comp_number ?? comparables.indexOf(editingComp) + 1)
          : comparables.length + 1
        }
        allComparables={comparables}
        subjectLocation={subjectLocation}
      />
    </div>
  );
}
