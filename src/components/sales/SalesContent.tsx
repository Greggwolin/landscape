/**
 * Sales Content Container
 * Main container component for Sales & Absorption tab
 */

'use client';

import React, { useState, useMemo } from 'react';
import { CBadge } from '@coreui/react';
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection';
import AnnualInventoryGauge from './AnnualInventoryGauge';
import AreaTiles from '@/components/shared/AreaTiles';
import PhaseTiles from './PhaseTiles';
import ParcelSalesTable from './ParcelSalesTable';
import PricingTable from './PricingTable';
import SaleTransactionDetails from './SaleTransactionDetails';
import { useContainers } from '@/hooks/useContainers';
import { usePhaseStats, useParcelsWithSales } from '@/hooks/useSalesAbsorption';
import { usePreference } from '@/hooks/useUserPreferences';
import type { BudgetMode } from '@/components/budget/ModeSelector';
import { ExportButton } from '@/components/admin';

// Sales mode uses the same type as Budget mode for consistency
export type SalesMode = BudgetMode;

interface Props {
  projectId: number;
}

export default function SalesContent({ projectId }: Props) {
  // Mode state with database persistence via usePreference hook
  const [mode] = usePreference<SalesMode>({
    key: 'sales.mode',
    defaultValue: 'napkin',
    scopeType: 'project',
    scopeId: projectId,
    migrateFrom: `sales_mode_${projectId}`, // Auto-migrate from old localStorage key
  });
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>([]);
  const { phases: containerPhases } = useContainers({ projectId, includeCosts: false });
  const { data: phases } = usePhaseStats(projectId);
  const { data: parcelSalesData } = useParcelsWithSales(projectId, selectedPhaseIds);

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

  const renderExportButton = () => (
    <span className="sales-export-button">
      <ExportButton
        tabName="Sales & Absorption"
        projectId={projectId.toString()}
        size="sm"
      />
    </span>
  );

  // Compute combined phase filters: selected phases + all phases from selected areas
  // Note: We need to map container IDs to phase_ids (used by /api/phases endpoint)
  const combinedPhaseFilters = useMemo(() => {
    if (!phases) return selectedPhaseIds;

    const phaseIds = new Set(selectedPhaseIds);

    // Add all phases from selected areas
    if (selectedAreaIds.length > 0) {
      containerPhases.forEach(containerPhase => {
        if (containerPhase.parent_id && selectedAreaIds.includes(containerPhase.parent_id)) {
          // Find matching phase by name to get its phase_id
          const matchingPhase = phases.find((p: any) => p.phase_name === containerPhase.name);
          if (matchingPhase) {
            phaseIds.add(matchingPhase.phase_id);
          }
        }
      });
    }

    return Array.from(phaseIds);
  }, [selectedAreaIds, selectedPhaseIds, containerPhases, phases]);

  return (
    <div
      className="space-y-4 w-full max-w-full"
      style={{ backgroundColor: 'var(--surface-bg)' }}
    >
      {/* Annual Inventory Gauge */}
      <CollapsibleSection
        title="Annual Inventory Gauge"
        itemCount={1}
        defaultExpanded={false}
        locked
        headerActions={
          <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
            Coming in Beta
          </span>
        }
      >
        <div className="p-4">
          <AnnualInventoryGauge projectId={projectId} />
        </div>
      </CollapsibleSection>

      {/* Areas/Phases and Land Use Pricing - Side by Side */}
      <div className="grid grid-cols-12 gap-4 w-full">
        {/* Left Column: Areas and Phases (wider) */}
        <div className="col-span-7">
          <CollapsibleSection
            title="Areas and Phases"
            itemCount={1}
            defaultExpanded={true}
            headerActions={
              <>
                {hasFilters && (
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
                )}
                {renderExportButton()}
              </>
            }
          >
            <div className="p-4 space-y-4">
              {/* Area Tiles */}
              <div>
                <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>Areas</h6>
                <AreaTiles
                  projectId={projectId}
                  selectedAreaIds={selectedAreaIds}
                  onAreaSelect={handleAreaSelect}
                  showCosts={true}
                />
              </div>

              {/* Phase Tiles */}
              <div>
                <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>Phases</h6>
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
        </div>

        {/* Right Column: Land Use Pricing (narrower) */}
        <div className="col-span-5 w-full">
          <CollapsibleSection
            title={
              hasFilters
                ? `Land Use Pricing (Filtered by ${selectedAreaIds.length > 0 ? `${selectedAreaIds.length} Area${selectedAreaIds.length > 1 ? 's' : ''}` : ''}${selectedAreaIds.length > 0 && selectedPhaseIds.length > 0 ? ' + ' : ''}${selectedPhaseIds.length > 0 ? `${selectedPhaseIds.length} Phase${selectedPhaseIds.length > 1 ? 's' : ''}` : ''})`
                : 'Land Use Pricing'
            }
            itemCount={1}
            defaultExpanded={true}
            headerActions={renderExportButton()}
          >
            <div className="p-4">
              <PricingTable
                projectId={projectId}
                phaseFilters={combinedPhaseFilters.length > 0 ? combinedPhaseFilters : undefined}
                mode={mode}
              />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Parcel Sales Table */}
      <CollapsibleSection
        title={
          hasFilters
            ? `Parcel Sales (Filtered by ${selectedAreaIds.length > 0 ? `${selectedAreaIds.length} Area${selectedAreaIds.length > 1 ? 's' : ''}` : ''}${selectedAreaIds.length > 0 && selectedPhaseIds.length > 0 ? ' + ' : ''}${selectedPhaseIds.length > 0 ? `${selectedPhaseIds.length} Phase${selectedPhaseIds.length > 1 ? 's' : ''}` : ''})`
            : 'Parcel Sales (All Areas & Phases)'
        }
        itemCount={1}
        defaultExpanded={true}
        headerActions={renderExportButton()}
      >
        <div className="p-4">
          <ParcelSalesTable
            projectId={projectId}
            phaseFilters={selectedPhaseIds}
            mode={mode}
          />
        </div>
      </CollapsibleSection>

      {/* Sale Transaction Details - Phase 3 Addition */}
      {parcelSalesData?.parcels && (
        <SaleTransactionDetails
          projectId={projectId}
          parcels={parcelSalesData.parcels}
        />
      )}
    </div>
  );
}
