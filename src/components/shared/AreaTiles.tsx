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

const AREA_COLORS = [
  '#e5d4f5', // Light purple
  '#d4f5e5', // Light green
  '#f5e5d4', // Light peach
  '#e5e5e5', // Light gray
  '#d4e5f5', // Light blue
  '#f5d4e5', // Light pink
  '#d4f5f5', // Light cyan
  '#f5f5d4', // Light yellow
]

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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {areas.map((area, index) => {
        const color = AREA_COLORS[index % AREA_COLORS.length]
        const isSelected = selectedAreaIds.includes(area.container_id)

        return (
          <div
            key={area.container_id}
            className={`rounded p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'shadow-lg' : ''
            }`}
            style={{
              borderColor: isSelected ? '#0d6efd' : '#E0E0E0',
              backgroundColor: isSelected ? color : `${color}80`
            }}
            onClick={() => onAreaSelect(area.container_id)}
          >
            <div className="text-center">
              <div
                className="text-lg font-bold mb-2"
                style={{ color: isSelected ? '#0d6efd' : '#424242' }}
              >
                {area.name}
              </div>

              <div className="space-y-1">
                <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                  {Math.round(area.acres).toLocaleString()} acres
                </div>

                {area.phaseCount !== undefined && area.phaseCount > 0 && (
                  <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                    {area.phaseCount} {area.phaseCount === 1 ? 'Phase' : 'Phases'}
                  </div>
                )}

                {area.parcelCount !== undefined && area.parcelCount > 0 && (
                  <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                    {area.parcelCount} {area.parcelCount === 1 ? 'Parcel' : 'Parcels'}
                  </div>
                )}

                {area.units > 0 && (
                  <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                    {Math.round(area.units).toLocaleString()} units
                  </div>
                )}

                {showCosts && (
                  <>
                    <div className="text-sm mt-2" style={{ color: 'var(--cui-body-color)' }}>
                      Area: {formatCurrency(area.directCost)}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                      Phase: {formatCurrency(area.childCost)}
                    </div>
                  </>
                )}
              </div>

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs font-medium" style={{ color: '#0d6efd' }}>
                    ✓ Selected
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
