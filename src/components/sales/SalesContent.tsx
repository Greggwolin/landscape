/**
 * Sales Content Container
 * Main container component for Sales & Absorption tab
 */

'use client';

import React, { useState } from 'react';
import { CBadge } from '@coreui/react';
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection';
import AnnualInventoryGauge from './AnnualInventoryGauge';
import AreaTiles from '@/components/shared/AreaTiles';
import PhaseTiles from './PhaseTiles';
import ParcelSalesTable from './ParcelSalesTable';
import PricingTable from './PricingTable';

interface Props {
  projectId: number;
}

export default function SalesContent({ projectId }: Props) {
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>([]);

  const handleAreaSelect = (areaId: number | null) => {
    if (areaId === null) {
      // Clear all area selections
      setSelectedAreaIds([]);
      setSelectedPhaseIds([]); // Also clear phase selections
    } else {
      // Toggle individual area
      setSelectedAreaIds((prev) =>
        prev.includes(areaId)
          ? prev.filter((id) => id !== areaId)
          : [...prev, areaId]
      );
    }
  };

  const handlePhaseSelect = (phaseId: number | null) => {
    if (phaseId === null) {
      // Clear phase selection
      setSelectedPhaseIds([]);
    } else {
      // Toggle individual phase
      setSelectedPhaseIds((prev) =>
        prev.includes(phaseId)
          ? prev.filter((id) => id !== phaseId)
          : [...prev, phaseId]
      );
    }
  };

  const handleClearFilters = () => {
    setSelectedAreaIds([]);
    setSelectedPhaseIds([]);
  };

  const hasFilters = selectedAreaIds.length > 0 || selectedPhaseIds.length > 0;

  return (
    <div
      className="p-4 space-y-4 min-h-screen"
      style={{ backgroundColor: 'rgb(230, 231, 235)' }}
    >
      {/* Annual Inventory Gauge */}
      <CollapsibleSection
        title="Annual Inventory Gauge"
        itemCount={1}
        defaultExpanded={true}
      >
        <div className="p-4">
          <AnnualInventoryGauge projectId={projectId} />
        </div>
      </CollapsibleSection>

      {/* Land Use Pricing */}
      <CollapsibleSection
        title="Land Use Pricing"
        itemCount={1}
        defaultExpanded={true}
      >
        <div className="p-4">
          <PricingTable projectId={projectId} />
        </div>
      </CollapsibleSection>

      {/* Areas and Phases Filter Tiles */}
      <CollapsibleSection
        title="Areas and Phases"
        itemCount={1}
        defaultExpanded={true}
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
        <div className="p-4 space-y-4">
          {/* Area Tiles */}
          <div>
            <h6 className="text-sm font-semibold text-gray-600 mb-2">Areas</h6>
            <AreaTiles
              projectId={projectId}
              selectedAreaIds={selectedAreaIds}
              onAreaSelect={handleAreaSelect}
              showCosts={true}
            />
          </div>

          {/* Phase Tiles */}
          <div>
            <h6 className="text-sm font-semibold text-gray-600 mb-2">Phases</h6>
            <PhaseTiles
              projectId={projectId}
              selectedPhaseIds={selectedPhaseIds}
              selectedAreaIds={selectedAreaIds}
              onPhaseSelect={handlePhaseSelect}
              showCosts={true}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Parcel Sales Table */}
      <CollapsibleSection
        title={
          hasFilters
            ? `Parcel Sales (Filtered by ${selectedAreaIds.length > 0 ? `${selectedAreaIds.length} Area${selectedAreaIds.length > 1 ? 's' : ''}` : ''}${selectedAreaIds.length > 0 && selectedPhaseIds.length > 0 ? ' + ' : ''}${selectedPhaseIds.length > 0 ? `${selectedPhaseIds.length} Phase${selectedPhaseIds.length > 1 ? 's' : ''}` : ''})`
            : 'Parcel Sales (All Areas & Phases)'
        }
        itemCount={1}
        defaultExpanded={true}
      >
        <div className="p-4">
          <ParcelSalesTable projectId={projectId} phaseFilters={selectedPhaseIds} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
