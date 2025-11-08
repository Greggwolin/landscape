/**
 * Filters Accordion
 * Container/Phase filter tiles for Budget tab
 */

'use client'

import React from 'react'
import { CBadge } from '@coreui/react'
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection'
import { useContainers } from '@/hooks/useContainers'
import { useProjectConfig } from '@/hooks/useProjectConfig'

interface Props {
  projectId: number
  selectedAreaIds: number[]
  selectedPhaseIds: number[]
  onAreaSelect: (areaId: number | null) => void
  onPhaseSelect: (phaseId: number | null) => void
  onClearFilters: () => void
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

// Much darker colors for Areas (level 1) - high contrast
const AREA_COLORS = [
  '#1A237E', // Very Deep Indigo
  '#004D40', // Very Dark Teal
  '#BF360C', // Very Deep Orange Red
  '#3E2723', // Very Dark Brown
  '#263238', // Very Dark Blue Grey
  '#880E4F', // Very Dark Pink
  '#1B5E20', // Very Dark Green
  '#E65100', // Very Dark Orange
]

// Lighter colors for Phases (level 2) - pastel variants
const PHASE_COLORS = [
  '#CE93D8', // Lighter Purple
  '#A5D6A7', // Lighter Green
  '#FFCC80', // Lighter Orange
  '#D7CCC8', // Lighter Brown
  '#CFD8DC', // Lighter Blue Grey
  '#F8BBD0', // Lighter Pink
  '#B2EBF2', // Lighter Cyan
  '#FFE082', // Lighter Yellow
]

export default function FiltersAccordion({
  projectId,
  selectedAreaIds,
  selectedPhaseIds,
  onAreaSelect,
  onPhaseSelect,
  onClearFilters
}: Props) {
  const { areas, phases, isLoading } = useContainers({ projectId, includeCosts: true })
  const { labels } = useProjectConfig(projectId)

  // Filter out containers with no acres (these are duplicates or empty containers)
  const validAreas = React.useMemo(() => {
    return areas.filter(area => area.acres > 0 || area.units > 0)
  }, [areas])

  const validPhases = React.useMemo(() => {
    return phases.filter(phase => phase.acres > 0 || phase.units > 0)
  }, [phases])

  const hasFilters = selectedAreaIds.length > 0 || selectedPhaseIds.length > 0

  // Filter phases by selected areas
  const filteredPhases = React.useMemo(() => {
    if (selectedAreaIds.length === 0) return validPhases
    return validPhases.filter(phase => selectedAreaIds.includes(phase.parent_id!))
  }, [validPhases, selectedAreaIds])

  // Map phases to their parent area index for color coordination
  const areaIndexMap = React.useMemo(() => {
    const map = new Map<number, number>()
    validAreas.forEach((area, index) => {
      map.set(area.container_id, index)
    })
    return map
  }, [validAreas])

  return (
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
              e.stopPropagation()
              onClearFilters()
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
          <h6 className="text-sm font-semibold text-gray-600 mb-2">{labels.level1LabelPlural}</h6>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded border-2"></div>
                </div>
              ))}
            </div>
          ) : validAreas.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
              <p>No {labels.level1LabelPlural.toLowerCase()} defined for this project</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {validAreas.map((area, index) => {
                const color = AREA_COLORS[index % AREA_COLORS.length]
                const isSelected = selectedAreaIds.includes(area.container_id)

                return (
                  <div
                    key={area.container_id}
                    className={`rounded p-3 border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'shadow-lg' : ''
                    }`}
                    style={{
                      borderColor: isSelected ? '#0d6efd' : '#E0E0E0',
                      backgroundColor: isSelected ? `${color}40` : `${color}20`
                    }}
                    onClick={() => onAreaSelect(area.container_id)}
                  >
                    <div className="text-center">
                      <div
                        className="text-base font-bold mb-1"
                        style={{ color: isSelected ? color : '#424242' }}
                      >
                        {labels.level1Label} {area.name}
                      </div>

                      <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
                        {Math.round(area.acres).toLocaleString()} ac
                      </div>

                      {area.phaseCount !== undefined && area.phaseCount > 0 && (
                        <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
                          {area.phaseCount} {labels.level2Label}{area.phaseCount > 1 ? 's' : ''}
                        </div>
                      )}

                      {area.units > 0 && (
                        <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
                          {Math.round(area.units).toLocaleString()} units
                        </div>
                      )}

                      <div className="text-xs mt-1 font-medium" style={{ color: color }}>
                        {formatCurrency(area.totalCost)}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="text-xs font-medium text-center" style={{ color }}>
                          ✓ Selected
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Phase Tiles */}
        <div>
          <h6 className="text-sm font-semibold text-gray-600 mb-2">{labels.level2LabelPlural}</h6>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded border-2"></div>
                </div>
              ))}
            </div>
          ) : filteredPhases.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
              <p>No {labels.level2LabelPlural.toLowerCase()} {selectedAreaIds.length > 0 ? `in selected ${labels.level1LabelPlural.toLowerCase()}` : 'defined for this project'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {filteredPhases.map((phase) => {
                // Use parent area's color index for color coordination
                const areaIndex = areaIndexMap.get(phase.parent_id!) ?? 0
                const color = PHASE_COLORS[areaIndex % PHASE_COLORS.length]
                const isSelected = selectedPhaseIds.includes(phase.container_id)
                const isHighlighted = !isSelected && selectedAreaIds.includes(phase.parent_id!)

                return (
                  <div
                    key={phase.container_id}
                    className={`rounded p-3 border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'shadow-lg' : ''
                    }`}
                    style={{
                      borderColor: isSelected ? '#212121' : isHighlighted ? '#ffc107' : '#E0E0E0',
                      backgroundColor: isSelected ? `${color}60` : `${color}40`,
                      opacity: isHighlighted ? 0.85 : 1
                    }}
                    onClick={() => onPhaseSelect(phase.container_id)}
                  >
                    <div className="text-center">
                      <div
                        className="text-base font-bold mb-1"
                        style={{ color: isSelected ? '#212121' : '#424242' }}
                      >
                        {labels.level2Label} {phase.name}
                      </div>

                      <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
                        {Math.round(phase.acres).toLocaleString()} ac
                      </div>

                      {phase.parcelCount !== undefined && phase.parcelCount > 0 && (
                        <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
                          {phase.parcelCount} Parcel{phase.parcelCount > 1 ? 's' : ''}
                        </div>
                      )}

                      {phase.units > 0 && (
                        <div className="text-xs" style={{ color: 'var(--cui-body-color)' }}>
                          {Math.round(phase.units).toLocaleString()} units
                        </div>
                      )}

                      <div className="text-xs mt-1 font-medium" style={{ color: '#424242' }}>
                        {formatCurrency(phase.totalCost)}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="text-xs font-medium text-center" style={{ color: '#212121' }}>
                          ✓ Selected
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  )
}
