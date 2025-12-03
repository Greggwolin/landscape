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
  includeProjectLevel: boolean
  projectLevelItemCount: number
  onProjectLevelToggle: (include: boolean) => void
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

// Color arrays removed - now using global planning-tile classes from component-patterns.css

export default function FiltersAccordion({
  projectId,
  selectedAreaIds,
  selectedPhaseIds,
  onAreaSelect,
  onPhaseSelect,
  onClearFilters,
  includeProjectLevel,
  projectLevelItemCount,
  onProjectLevelToggle
}: Props) {
  const { areas, phases, isLoading } = useContainers({ projectId, includeCosts: true })
  const { labels } = useProjectConfig(projectId)

  // Prefer containers with data, but fall back to showing everything so users can still select areas/phases
  const validAreas = React.useMemo(() => {
    const filtered = areas.filter(area =>
      area.acres > 0 || area.units > 0 || area.phaseCount > 0 || area.parcelCount > 0 || area.totalCost > 0
    )
    return filtered.length > 0 ? filtered : areas
  }, [areas])

  const validPhases = React.useMemo(() => {
    const filtered = phases.filter(phase =>
      phase.acres > 0 || phase.units > 0 || phase.parcelCount > 0 || phase.totalCost > 0
    )
    return filtered.length > 0 ? filtered : phases
  }, [phases])

  const hasFilters = selectedAreaIds.length > 0 || selectedPhaseIds.length > 0

  // Filter phases by selected areas
  const filteredPhases = React.useMemo(() => {
    if (selectedAreaIds.length === 0) return validPhases
    return validPhases.filter(phase => selectedAreaIds.includes(phase.parent_id!))
  }, [validPhases, selectedAreaIds])


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
          <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>{labels.level1LabelPlural}</h6>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            <div
              className={`planning-tile ${includeProjectLevel ? 'planning-tile-active' : ''}`}
              onClick={() => onProjectLevelToggle(!includeProjectLevel)}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="planning-tile-header">
                  Project Level
                </div>
                <CBadge color={includeProjectLevel ? 'primary' : 'secondary'}>
                  {projectLevelItemCount}
                </CBadge>
              </div>
              <div className="planning-tile-stat">
                Items without {labels.level1Label.toLowerCase()} / {labels.level2Label.toLowerCase()}
              </div>
              {includeProjectLevel && (
                <div className="mt-2 pt-2 border-top border-gray-300 text-xs text-primary text-center fw-semibold">
                  ✓ Selected
                </div>
              )}
            </div>

            {isLoading &&
              [...Array(4)].map((_, i) => (
                <div key={`area-skel-${i}`} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded border-2"></div>
                </div>
              ))}

            {!isLoading && validAreas.length > 0 && validAreas.map((area) => {
              const isSelected = selectedAreaIds.includes(area.division_id)
              // Clean the name: remove redundant "Area" since we're already prefixing with the label
              const cleanName = area.name
                .replace(/\bArea\b/gi, '')
                .replace(/\s{2,}/g, ' ')
                .trim()

              return (
                <div
                  key={area.division_id}
                  className={`planning-tile text-center ${isSelected ? 'planning-tile-active' : ''}`}
                  onClick={() => onAreaSelect(area.division_id)}
                >
                  <div className="planning-tile-header">
                    {labels.level1Label} {cleanName}
                  </div>

                  <div className="planning-tile-stat">
                    {Math.round(area.acres).toLocaleString()} ac
                  </div>

                  {area.phaseCount !== undefined && area.phaseCount > 0 && (
                    <div className="planning-tile-stat">
                      {area.phaseCount} {labels.level2Label}{area.phaseCount > 1 ? 's' : ''}
                    </div>
                  )}

                  {area.units > 0 && (
                    <div className="planning-tile-stat">
                      {Math.round(area.units).toLocaleString()} units
                    </div>
                  )}

                  <div className="planning-tile-stat font-medium mt-1">
                    {formatCurrency(area.totalCost)}
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-subtle">
                      <div className="text-xs font-medium text-center">
                        ✓ Selected
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!isLoading && validAreas.length === 0 && (
            <div className="p-4 mt-3 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
              <p>No {labels.level1LabelPlural.toLowerCase()} defined for this project</p>
            </div>
          )}
        </div>

        {/* Phase Tiles */}
        <div>
          <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>{labels.level2LabelPlural}</h6>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded border-2"></div>
                </div>
              ))}
            </div>
          ) : filteredPhases.length === 0 ? (
            <div className="p-4 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
              <p>No {labels.level2LabelPlural.toLowerCase()} {selectedAreaIds.length > 0 ? `in selected ${labels.level1LabelPlural.toLowerCase()}` : 'defined for this project'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {filteredPhases.map((phase) => {
                const isSelected = selectedPhaseIds.includes(phase.division_id)
                const isHighlighted = !isSelected && selectedAreaIds.includes(phase.parent_id!)

                return (
                  <div
                    key={phase.division_id}
                    className={`planning-tile text-center ${isSelected ? 'planning-tile-active' : ''} ${isHighlighted ? 'planning-tile-highlighted' : ''}`}
                    onClick={() => onPhaseSelect(phase.division_id)}
                  >
                    <div className="planning-tile-header">
                      {labels.level2Label} {phase.name}
                    </div>

                    <div className="planning-tile-stat">
                      {Math.round(phase.acres).toLocaleString()} ac
                    </div>

                    {phase.parcelCount !== undefined && phase.parcelCount > 0 && (
                      <div className="planning-tile-stat">
                        {phase.parcelCount} Parcel{phase.parcelCount > 1 ? 's' : ''}
                      </div>
                    )}

                    {phase.units > 0 && (
                      <div className="planning-tile-stat">
                        {Math.round(phase.units).toLocaleString()} units
                      </div>
                    )}

                    <div className="planning-tile-stat font-medium mt-1">
                      {formatCurrency(phase.totalCost)}
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-subtle">
                        <div className="text-xs font-medium text-center">
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
