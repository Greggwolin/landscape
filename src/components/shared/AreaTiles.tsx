/**
 * Area Tiles
 * Display area summary cards for filtering by geographical area/container level 1
 */

'use client'

import React, { useMemo } from 'react'
import { useContainers } from '@/hooks/useContainers'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { useParcelsWithSales } from '@/hooks/useSalesAbsorption'

interface Props {
  projectId: number
  selectedAreaIds: number[]
  onAreaSelect: (areaId: number | null) => void
  showCosts?: boolean
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value === 0) return '$0'
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${Math.round(value).toLocaleString()}`
}

export default function AreaTiles({
  projectId,
  selectedAreaIds,
  onAreaSelect,
  showCosts = false
}: Props) {
  const { areas, phases, isLoading, error } = useContainers({
    projectId,
    includeCosts: showCosts
  })
  const { labels } = useProjectConfig(projectId)
  const { data: parcelDataset } = useParcelsWithSales(projectId, null)

  // Calculate net proceeds per area by aggregating from parcels through phases
  const areaNetProceeds = useMemo(() => {
    const proceedsMap = new Map<number, number>()
    if (!parcelDataset?.parcels || !phases.length || !areas.length) return proceedsMap

    const parcels = parcelDataset.parcels

    // Build a map of phase_name -> parent area division_id
    const phaseToAreaMap = new Map<string, number>()
    phases.forEach(phase => {
      if (phase.parent_id) {
        phaseToAreaMap.set(phase.name, phase.parent_id)
      }
    })

    // Initialize area proceeds
    areas.forEach(area => proceedsMap.set(area.division_id, 0))

    // Sum up net proceeds per area from parcels
    parcels.forEach(parcel => {
      if (parcel.phase_name) {
        const areaId = phaseToAreaMap.get(parcel.phase_name)
        if (areaId) {
          const current = proceedsMap.get(areaId) || 0
          proceedsMap.set(areaId, current + (parcel.net_proceeds || 0))
        }
      }
    })

    return proceedsMap
  }, [areas, phases, parcelDataset])

  const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';

  if (isLoading) {
    return (
      <div className={gridClass}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-40 bg-gray-200 rounded border-2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p>Failed to load area data</p>
      </div>
    )
  }

  if (!areas || areas.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
        <p>No areas defined for this project</p>
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {areas.map((area) => {
        const isSelected = selectedAreaIds.includes(area.division_id)

        const rawName = area.name || area.code || `Area ${area.division_id}`;
        // Remove standalone word "Area" while keeping other context (e.g., "Village Area 1" -> "Village 1")
        const cleaned = rawName
          .replace(/\bArea\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        const displayName = cleaned.length > 0 ? cleaned : rawName;
        const netProceeds = areaNetProceeds.get(area.division_id) || 0;

        return (
          <div
            key={area.division_id}
            className={`planning-tile text-center ${isSelected ? 'planning-tile-active' : ''}`}
            onClick={() => onAreaSelect(area.division_id)}
          >
            <div className="planning-tile-header mb-3 truncate whitespace-nowrap">
              {labels.level1Label} {displayName}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--cui-body-color)' }}>Acres:</span>
                <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  {Math.round(area.acres).toLocaleString()}
                </span>
              </div>

              {area.phaseCount !== undefined && area.phaseCount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--cui-body-color)' }}>Phases:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {area.phaseCount}
                  </span>
                </div>
              )}

              {area.parcelCount !== undefined && area.parcelCount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--cui-body-color)' }}>Parcels:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {area.parcelCount}
                  </span>
                </div>
              )}

              {area.units > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--cui-body-color)' }}>Units:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {Math.round(area.units).toLocaleString()}
                  </span>
                </div>
              )}

              {showCosts && area.totalCost > 0 && (
                <div className="flex justify-between mt-1">
                  <span style={{ color: 'var(--cui-body-color)' }}>Budget:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-success)' }}>
                    {formatCurrency(area.totalCost)}
                  </span>
                </div>
              )}

              {netProceeds > 0 && (
                <div className="flex justify-between mt-1">
                  <span style={{ color: 'var(--cui-body-color)' }}>Net $$:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-success)' }}>
                    {formatCurrency(netProceeds)}
                  </span>
                </div>
              )}

            </div>

            {isSelected && (
              <div className="mt-3 pt-3 border-t border-subtle">
                <div className="text-xs font-medium" style={{ color: 'var(--cui-primary)' }}>
                  ✓ Selected
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
