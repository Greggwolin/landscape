/**
 * SalesComparisonApproach Component
 *
 * Main component for the Sales Comparison Approach valuation method
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { SalesComparable, ValuationReconciliation } from '@/types/valuation';
import { ComparablesGrid } from './ComparablesGrid';
import { IndicatedValueSummary } from './IndicatedValueSummary';
import { LandscaperChatPanel } from './LandscaperChatPanel';
import { ComparablesMap } from './ComparablesMap';
import ValuationSalesCompMap from '@/components/map/ValuationSalesCompMap';
import { LandscapeButton } from '@/components/ui/landscape';

interface SalesComparisonApproachProps {
  projectId: number;
  comparables: SalesComparable[];
  reconciliation: ValuationReconciliation | null;
  onRefresh?: () => void;
}

export function SalesComparisonApproach({
  projectId,
  comparables,
  reconciliation,
  onRefresh
}: SalesComparisonApproachProps) {
  const [selectedComp, setSelectedComp] = useState<SalesComparable | null>(null);
  const [mapHeight, setMapHeight] = useState<string>('800px');
  const gridRef = useRef<HTMLDivElement>(null);

  // Measure the grid height and set map to match
  useEffect(() => {
    const updateMapHeight = () => {
      if (gridRef.current) {
        const height = gridRef.current.offsetHeight;
        setMapHeight(`${height}px`);
      }
    };

    // Initial measurement
    updateMapHeight();

    // Update on window resize
    window.addEventListener('resize', updateMapHeight);

    // Use ResizeObserver to detect when grid content changes
    const resizeObserver = new ResizeObserver(updateMapHeight);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateMapHeight);
      resizeObserver.disconnect();
    };
  }, [comparables]);

  const handleEditComp = (comp: SalesComparable) => {
    setSelectedComp(comp);
    // In production, open modal/drawer for editing
    alert(`Edit functionality for "${comp.property_name}" - Coming in Phase 2`);
  };

  const handleDeleteComp = async (compId: number) => {
    try {
      // In production, call API to delete
      alert(`Delete functionality for comparable ID ${compId} - Coming in Phase 2`);
      // await deleteSalesComparable(compId);
      // onRefresh?.();
    } catch (error) {
      console.error('Error deleting comparable:', error);
      alert('Error deleting comparable');
    }
  };

  const handleAddComp = () => {
    // In production, open modal/drawer for adding new comp
    alert('Add comparable functionality - Coming in Phase 2');
  };

  // Determine layout based on number of comps
  // If more than 5 comps: Map goes above grid (full width)
  // If 5 or fewer comps: Map goes in sidebar (right side)
  const showMapAbove = comparables.length > 5;

  // Subject property location (Chadron Ave - hardcoded for now, should come from project data)
  const subjectProperty = {
    latitude: 33.9164,
    longitude: -118.3525,
    name: '14105 Chadron Ave'
  };

  return (
    <div className="space-y-6">
      {/* Map Above Grid (when more than 5 comps) */}
      {comparables.length > 0 && showMapAbove && (
        <ValuationSalesCompMap
          projectId={projectId.toString()}
          styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'}
          height="500px"
        />
      )}

      {/* Main Layout: Grid + Sidebar or Full Width */}
      {comparables.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="text-6xl mb-4">🏢</div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--cui-body-color)' }}
          >
            No Comparables Yet
          </h3>
          <p
            className="text-sm mb-4"
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
          <div className={showMapAbove ? "space-y-6" : "grid gap-6"} style={!showMapAbove ? { gridTemplateColumns: 'auto 1fr', alignItems: 'stretch' } : {}}>
            {/* Main Content - Grid */}
            <div ref={gridRef}>
              <ComparablesGrid
                comparables={comparables}
                projectId={projectId}
                onEdit={handleEditComp}
                onRefresh={onRefresh}
                onAddComp={handleAddComp}
              />
            </div>

            {/* Sidebar - Map (when 5 or fewer comps) - Same height as grid */}
            {!showMapAbove && (
              <ValuationSalesCompMap
                projectId={projectId.toString()}
                styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'}
                height={mapHeight}
              />
            )}
          </div>

          {/* Bottom Section: Landscaper (left) + Indicated Value (right) - Always 50/50 */}
          <div className="grid grid-cols-2 gap-6">
            {/* Landscaper AI - Left side */}
            <LandscaperChatPanel
              projectId={projectId}
              comparables={comparables}
              subjectAskingPrice={47500000}
              subjectUnits={113}
            />

            {/* Indicated Value Summary - Right side */}
            <IndicatedValueSummary
              comparables={comparables}
              reconciliation={reconciliation}
              subjectUnits={113}
              subjectAskingPrice={47500000}
            />
          </div>
        </>
      )}
    </div>
  );
}
