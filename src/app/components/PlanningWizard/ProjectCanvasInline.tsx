'use client'

import React, { useMemo, useState } from 'react'
import DropZone from './DropZone'
import type { Project, Area, Phase, Parcel } from './PlanningWizard'
import { useProjectConfig } from '@/hooks/useProjectConfig'

interface ProjectCanvasInlineProps {
  project: Project
  onAddArea: () => void
  onAddPhase: (areaId: string) => void
  onOpenPhase: (areaId: string, phaseId: string) => void
  onUpdateArea: (areaId: string, updates: { name: string; description: string }) => void
  onUpdatePhase: (areaId: string, phaseId: string, updates: { name: string; description: string }) => void
}

const getLandUseColor = (landUse?: string) => {
  if (!landUse) return 'bg-slate-600'
  switch (landUse) {
    case 'LDR':
    case 'SFD':
    case 'RES':
      return 'bg-emerald-600'
    case 'MDR':
    case 'MF':
      return 'bg-green-600'
    case 'HDR':
    case 'MHDR':
      return 'bg-teal-600'
    case 'C':
    case 'RET':
    case 'OFF':
      return 'bg-orange-600'
    case 'MU':
      return 'bg-amber-600'
    case 'OS':
      return 'bg-blue-600'
    default:
      return 'bg-slate-600'
  }
}

const getLandUseBorderColor = (landUse?: string) => {
  if (!landUse) return 'border-slate-500'
  switch (landUse) {
    case 'LDR':
    case 'SFD':
    case 'RES':
      return 'border-emerald-500'
    case 'MDR':
    case 'MF':
      return 'border-green-500'
    case 'HDR':
    case 'MHDR':
      return 'border-teal-500'
    case 'C':
    case 'RET':
    case 'OFF':
      return 'border-orange-500'
    case 'MU':
      return 'border-amber-500'
    case 'OS':
      return 'border-blue-500'
    default:
      return 'border-slate-500'
  }
}

const ProjectCanvasInline: React.FC<ProjectCanvasInlineProps> = ({
  project,
  onAddArea,
  onAddPhase,
  onOpenPhase,
  onUpdateArea,
  onUpdatePhase,
}) => {
  // Extract project ID from composite ID
  const projectIdFromId = (id: string): number | null => {
    const parts = id.split('-')
    const last = parts[parts.length - 1]
    const parsed = Number(last)
    return Number.isFinite(parsed) ? parsed : null
  }

  // Get dynamic labels for this project
  const projectId = projectIdFromId(project.id)
  const { labels } = useProjectConfig(projectId ?? undefined)

  const [editingArea, setEditingArea] = useState<string | null>(null)
  const [areaValues, setAreaValues] = useState<Record<string, { name: string; description: string }>>({})
  const [editingPhase, setEditingPhase] = useState<string | null>(null)
  const [phaseValues, setPhaseValues] = useState<Record<string, { areaId: string; name: string; description: string }>>({})

  const beginEditArea = (area: Area) => {
    setEditingArea(area.id)
    setAreaValues(prev => ({
      ...prev,
      [area.id]: {
        name: area.name,
        description: typeof (area as any).description === 'string' ? (area as any).description : '',
      },
    }))
  }

  const saveArea = (areaId: string) => {
    const values = areaValues[areaId]
    if (!values) return
    onUpdateArea(areaId, values)
    setEditingArea(null)
  }

  const cancelAreaEdit = () => {
    setEditingArea(null)
  }

  const beginEditPhase = (areaId: string, phase: Phase) => {
    setEditingPhase(phase.id)
    setPhaseValues(prev => ({
      ...prev,
      [phase.id]: {
        areaId,
        name: phase.name,
        description: typeof (phase as any).description === 'string' ? (phase as any).description : '',
      },
    }))
  }

  const savePhase = (phaseId: string) => {
    const values = phaseValues[phaseId]
    if (!values) return
    onUpdatePhase(values.areaId, phaseId, { name: values.name, description: values.description })
    setEditingPhase(null)
  }

  const cancelPhaseEdit = () => {
    setEditingPhase(null)
  }

  const dropHandlers = useMemo(() => {
    const map = new Map<string, (item: { type: string }) => void>()
    project.areas.forEach(area => {
      map.set(area.id, (item: { type: string }) => {
        if (item.type === 'phase') {
          onAddPhase(area.id)
        }
      })
    })
    return map
  }, [project.areas, onAddPhase])

  const renderParcelGrid = (phase: Phase) => (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {phase.parcels.map((parcel: Parcel) => (
        <div
          key={parcel.id}
          className={`${getLandUseColor(parcel.usecode || parcel.landUse)} ${getLandUseBorderColor(parcel.usecode || parcel.landUse)} text-white rounded text-xs p-2 border transition-all duration-200`}
        >
          <div className="font-semibold text-xs mb-1 truncate">{parcel.name.replace('Parcel: ', '')}</div>
          <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-left">
            <span className="opacity-90">Use:</span>
            <span className="font-medium truncate">{parcel.usecode || parcel.landUse}</span>
            <span className="opacity-90">Acres:</span>
            <span className="font-medium">{parcel.acres ?? 0}</span>
            <span className="opacity-90">Units:</span>
            <span className="font-medium">{parcel.units ?? 0}</span>
            <span className="opacity-90">Product:</span>
            <span className="font-medium truncate">{parcel.product || '-'}</span>
          </div>
        </div>
      ))}
      {phase.parcels.length === 0 && (
        <div className="text-xs text-gray-200 col-span-2 text-center italic">No {labels.level3LabelPlural.toLowerCase()}</div>
      )}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">{project.name}</h1>
        <button
          onClick={onAddArea}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
        >
          Add {labels.level1Label}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {project.areas.map(area => {
          const isEditing = editingArea === area.id
          const values = areaValues[area.id] ?? { name: area.name, description: (area as any).description ?? '' }
          const dropHandler = dropHandlers.get(area.id) ?? (() => {})
          return (
            <DropZone
              key={area.id}
              accepts={['phase']}
              onDrop={dropHandler}
              className="min-h-[320px]"
            >
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <input
                        value={values.name}
                        onChange={e => setAreaValues(prev => ({ ...prev, [area.id]: { ...values, name: e.target.value } }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                      />
                      <textarea
                        value={values.description}
                        onChange={e => setAreaValues(prev => ({ ...prev, [area.id]: { ...values, description: e.target.value } }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                        rows={2}
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm font-semibold text-white">{area.name}</h3>
                      {(area as any).description && (
                        <p className="text-xs text-gray-300 mt-1">{(area as any).description}</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 ml-3 text-xs">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveArea(area.id)} className="px-2 py-1 bg-green-600 text-white rounded">Save</button>
                        <button onClick={cancelAreaEdit} className="px-2 py-1 bg-gray-600 text-white rounded">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => beginEditArea(area)} className="px-2 py-1 bg-gray-700 text-white rounded">Edit</button>
                        <button onClick={() => onAddPhase(area.id)} className="px-2 py-1 bg-blue-600 text-white rounded">Add {labels.level2Label}</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {area.phases.map(phase => {
                    const phaseEditing = editingPhase === phase.id
                    const phaseVals = phaseValues[phase.id] ?? {
                      areaId: area.id,
                      name: phase.name,
                      description: (phase as any).description ?? '',
                    }
                    return (
                      <div key={phase.id} className="bg-gray-900 border border-gray-700 rounded p-3">
                        <div className="flex items-start justify-between">
                          {phaseEditing ? (
                            <div className="flex-1 space-y-2">
                              <input
                                value={phaseVals.name}
                                onChange={e => setPhaseValues(prev => ({ ...prev, [phase.id]: { ...phaseVals, name: e.target.value } }))}
                                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                              />
                              <textarea
                                value={phaseVals.description}
                                onChange={e => setPhaseValues(prev => ({ ...prev, [phase.id]: { ...phaseVals, description: e.target.value } }))}
                                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                rows={2}
                                placeholder="Description"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs font-semibold text-white">{phase.name}</div>
                              {(phase as any).description && (
                                <p className="text-xs text-gray-300 mt-1">{(phase as any).description}</p>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col gap-2 ml-3 text-[11px]">
                            {phaseEditing ? (
                              <>
                                <button onClick={() => savePhase(phase.id)} className="px-2 py-1 bg-green-600 text-white rounded">Save</button>
                                <button onClick={cancelPhaseEdit} className="px-2 py-1 bg-gray-600 text-white rounded">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => onOpenPhase(area.id, phase.id)} className="px-2 py-1 bg-blue-600 text-white rounded">Open</button>
                                <button onClick={() => beginEditPhase(area.id, phase)} className="px-2 py-1 bg-gray-700 text-white rounded">Edit</button>
                              </>
                            )}
                          </div>
                        </div>

                        {renderParcelGrid(phase)}
                      </div>
                    )
                  })}

                  {area.phases.length === 0 && (
                    <div className="text-xs text-gray-300 italic">No {labels.level2LabelPlural.toLowerCase()} yet. Add one to get started.</div>
                  )}
                </div>
              </div>
            </DropZone>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectCanvasInline
