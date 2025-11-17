/**
 * Area Tiles
 * Display area summary cards for filtering by geographical area/container level 1
 */

'use client'

import React from 'react'
import { useContainers } from '@/hooks/useContainers'

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
  const { areas, isLoading, error } = useContainers({
    projectId,
    includeCosts: showCosts
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {areas.map((area) => {
        const isSelected = selectedAreaIds.includes(area.container_id)

        return (
          <div
            key={area.container_id}
            className={`planning-tile text-center ${isSelected ? 'planning-tile-active' : ''}`}
            onClick={() => onAreaSelect(area.container_id)}
          >
            <div className="planning-tile-header">
              {area.name} #{area.code}
            </div>

            <div className="space-y-1">
              <div className="planning-tile-stat">
                {Math.round(area.acres).toLocaleString()} acres
              </div>

              {area.phaseCount !== undefined && area.phaseCount > 0 && (
                <div className="planning-tile-stat">
                  {area.phaseCount} {area.phaseCount === 1 ? 'Phase' : 'Phases'}
                </div>
              )}

              {area.parcelCount !== undefined && area.parcelCount > 0 && (
                <div className="planning-tile-stat">
                  {area.parcelCount} {area.parcelCount === 1 ? 'Parcel' : 'Parcels'}
                </div>
              )}

              {area.units > 0 && (
                <div className="planning-tile-stat">
                  {Math.round(area.units).toLocaleString()} units
                </div>
              )}

              {showCosts && (
                <>
                  <div className="planning-tile-stat mt-2">
                    Area: {formatCurrency(area.directCost)}
                  </div>
                  <div className="planning-tile-stat">
                    Phase: {formatCurrency(area.childCost)}
                  </div>
                </>
              )}
            </div>

            {isSelected && (
              <div className="mt-2 pt-2 border-t border-subtle">
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
