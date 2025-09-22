'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Project } from './PlanningWizard'
import DropZone from './DropZone'
import SimpleTaxonomySelector from '../LandUse/SimpleTaxonomySelector'
import InlineTaxonomySelector from '../LandUse/InlineTaxonomySelector'

interface ProjectCanvasProps {
  project: Project
  onAddArea?: () => void
  onAddPhase?: (areaId: string) => void
  onAddParcel?: (areaId: string, phaseId: string) => void
  onOpenPhase?: (areaId: string, phaseId: string) => void
  onOpenArea?: (areaId: string) => void
  showPhaseForm?: { areaId: string; areaName: string } | null
  onRefresh?: () => Promise<void> | void
}

const ProjectCanvas: React.FC<ProjectCanvasProps> = ({
  project,
  onAddArea,
  onAddPhase,
  onAddParcel,
  onOpenPhase,
  onOpenArea,
  showPhaseForm,
  onRefresh,
}) => {
  const projectIdFromId = (id: string): number | null => {
    const parts = id.split('-')
    const last = parts[parts.length - 1]
    const parsed = Number(last)
    return Number.isFinite(parsed) ? parsed : null
  }

  const [editing, setEditing] = useState<{ areaId: string; phaseId: string; parcelId: string } | null>(null)
  const [addingParcel, setAddingParcel] = useState<{ areaId: string; phaseId: string } | null>(null)
  const [draft, setDraft] = useState({
    acres: 0,
    units: 0,
    family_name: '',
    density_code: '',
    type_code: '',
    product_code: '',
  })
  const [newParcelDraft, setNewParcelDraft] = useState({
    family_name: '',
    density_code: '',
    type_code: '',
    product_code: '',
    acres: 0,
    units: 0,
  })

  const handlePhaseDrop = (areaId: string) => (item: { type: string }) => {
    if (item.type === 'phase') {
      onAddPhase?.(areaId)
    }
  }

  const getLandUseColor = (landUse?: string) => {
    if (!landUse) return 'bg-slate-600'
    switch (landUse) {
      case 'LDR': return 'bg-emerald-600'
      case 'MDR': return 'bg-green-600'
      case 'HDR': return 'bg-teal-600'
      case 'MHDR': return 'bg-cyan-600'
      case 'C': return 'bg-orange-600'
      case 'MU': return 'bg-amber-600'
      case 'OS': return 'bg-blue-600'
      default: return 'bg-slate-600'
    }
  }

  const getLandUseBorderColor = (landUse?: string) => {
    if (!landUse) return 'border-slate-500'
    switch (landUse) {
      case 'LDR': return 'border-emerald-500'
      case 'MDR': return 'border-green-500'
      case 'HDR': return 'border-teal-500'
      case 'MHDR': return 'border-cyan-500'
      case 'C': return 'border-orange-500'
      case 'MU': return 'border-amber-500'
      case 'OS': return 'border-blue-500'
      default: return 'border-slate-500'
    }
  }

  const findParcel = useCallback(
    (areaId: string, phaseId: string, parcelId: string) => {
      const areaRef = project.areas.find((a) => a.id === areaId)
      const phaseRef = areaRef?.phases.find((p) => p.id === phaseId)
      const parcelRef = phaseRef?.parcels.find((p) => p.id === parcelId)
      return { areaRef, phaseRef, parcelRef }
    },
    [project.areas],
  )


  const startEditingParcel = useCallback(
    (areaId: string, phaseId: string, parcelId: string) => {
      const { parcelRef } = findParcel(areaId, phaseId, parcelId)
      if (!parcelRef) return

      console.log('🚀 startEditingParcel - parcelRef:', parcelRef)
      console.log('🚀 startEditingParcel - taxonomy fields:', {
        family_name: parcelRef.family_name,
        density_code: parcelRef.density_code,
        type_code: parcelRef.type_code,
        product_code: parcelRef.product_code,
      })

      setEditing({ areaId, phaseId, parcelId })
      const draftValues = {
        acres: Number(parcelRef.acres ?? 0),
        units: Number(parcelRef.units ?? 0),
        family_name: parcelRef.family_name || '',
        density_code: parcelRef.density_code || '',
        type_code: parcelRef.type_code || '',
        product_code: parcelRef.product_code || '',
      }
      console.log('🚀 startEditingParcel - setting draft to:', draftValues)
      setDraft(draftValues)
    },
    [findParcel],
  )

  const cancelEdit = () => {
    setEditing(null)
    setDraft({
      acres: 0,
      units: 0,
      family_name: '',
      density_code: '',
      type_code: '',
      product_code: '',
    })
  }

  const cancelAddParcel = () => {
    setAddingParcel(null)
    setNewParcelDraft({
      family_name: '',
      density_code: '',
      type_code: '',
      product_code: '',
      acres: 0,
      units: 0,
    })
  }

  const startAddingParcel = (areaId: string, phaseId: string) => {
    setAddingParcel({ areaId, phaseId })
    setNewParcelDraft({
      family_name: '',
      density_code: '',
      type_code: '',
      product_code: '',
      acres: 0,
      units: 0,
    })
  }

  const editingParcel = useMemo(() => {
    if (!editing) return null
    const { parcelRef } = findParcel(editing.areaId, editing.phaseId, editing.parcelId)
    return parcelRef ?? null
  }, [editing, findParcel])




  const saveInlineEdit = async () => {
    if (!editing || !editingParcel?.dbId) {
      return
    }

    // Validate taxonomy selection
    if (!draft.family_name) {
      alert('Please select a family before saving.')
      return
    }

    const payload = {
      acres: Number(draft.acres),
      units: Number(draft.units),
      family_name: draft.family_name,
      density_code: draft.density_code || null,
      type_code: draft.type_code || null,
      product_code: draft.product_code || null,
    }

    try {
      const res = await fetch(`/api/parcels/${editingParcel.dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText)
      }

      cancelEdit()
      await onRefresh?.()
      window.dispatchEvent(new CustomEvent('dataChanged'))
    } catch (err) {
      console.error('Save error:', err)
      alert(`Failed to save parcel changes: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const saveNewParcel = async (areaId: string, phaseId: string) => {
    if (!addingParcel) return

    // Validate required fields
    if (!newParcelDraft.family_name) {
      alert('Please select family before saving.')
      return
    }

    try {
      // Get the area and phase database IDs
      const area = project.areas.find(a => a.id === areaId)
      const phase = area?.phases.find(p => p.id === phaseId)

      if (!area || !phase) {
        alert('Could not find area or phase information.')
        return
      }

      const projectId = projectIdFromId(project.id)
      if (!projectId) {
        alert('Could not determine project ID.')
        return
      }

      const payload = {
        project_id: projectId,
        area_id: area.areaDbId,
        phase_id: phase.phaseDbId,
        family_name: newParcelDraft.family_name,
        density_code: newParcelDraft.density_code || null,
        type_code: newParcelDraft.type_code || null,
        product_code: newParcelDraft.product_code || null,
        acres_gross: newParcelDraft.acres || null,
        units_total: newParcelDraft.units || null,
      }

      const res = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText)
      }

      cancelAddParcel()
      await onRefresh?.()
      window.dispatchEvent(new CustomEvent('dataChanged'))
    } catch (err) {
      console.error('Failed to create parcel', err)
      alert('Failed to create parcel: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 bg-gray-950">
        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
          <div className="border-b border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">{project.name}</h2>
            <div className="flex gap-4">
              <button
                onClick={() => onAddArea?.()}
                disabled={!onAddArea}
                className={`px-4 py-2 border-2 border-solid rounded-lg font-medium transition-all duration-200 ${
                  onAddArea
                    ? 'bg-gray-600 border-gray-500 text-white hover:outline hover:outline-2'
                    : 'bg-gray-700/60 border-gray-600/60 text-gray-400 cursor-not-allowed'
                }`}
                style={onAddArea ? { outlineColor: 'rgb(33,88,226)' } : undefined}
              >
                Add Area
              </button>
            </div>
          </div>

          <div className="p-6 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
              {project.areas.map((area) => (
                <div key={area.id} className="min-h-[520px]">
                  <DropZone accepts={['phase']} onDrop={handlePhaseDrop(area.id)} className="min-h-full">
                    <div
                      className="min-h-full rounded-lg p-4 bg-slate-600 border-2 border-slate-400 border-solid transition-all duration-200 group"
                      onClick={(e) => {
                        if (!onOpenArea) return
                        e.stopPropagation()
                        onOpenArea(area.id)
                      }}
                    >
                      <div className="text-center mb-4">
                        <h3 className="font-semibold text-white">{area.name}</h3>
                        {(area as any).description && (
                          <p className="text-xs text-gray-300 mt-1">{(area as any).description}</p>
                        )}
                      </div>

                      {area.phases.length === 0 ? (
                        <div className="text-center">
                          <button
                            onClick={(e) => {
                              if (!onAddPhase) return
                              e.stopPropagation()
                              onAddPhase(area.id)
                            }}
                            disabled={!onAddPhase}
                            className={`px-4 py-2 border-2 border-solid rounded-lg font-medium transition-all duration-200 ${
                              onAddPhase
                                ? 'bg-gray-600 border-gray-500 text-white hover:outline hover:outline-2'
                                : 'bg-gray-700/60 border-gray-600/60 text-gray-400 cursor-not-allowed'
                            }`}
                            style={onAddPhase ? { outlineColor: 'rgb(33,88,226)' } : undefined}
                          >
                            Add Phase
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col flex-1">
                          <div className="flex flex-col gap-2">
                            {area.phases.map((phase) => (
                              <div
                                key={phase.id}
                                onClick={(e) => {
                                  if (!onOpenPhase) return
                                  e.stopPropagation()
                                  onOpenPhase(area.id, phase.id)
                                }}
                                className={`bg-slate-700 rounded p-3 cursor-pointer border-2 ${
                                  showPhaseForm?.areaId === area.id
                                    ? 'border-dashed border-slate-400'
                                    : 'border-solid border-gray-500'
                                } hover:border-blue-400 transition-all duration-200`}
                              >
                                <div className="mb-2">
                                  <div className="mb-1">
                                    <div className="font-medium text-sm text-white">{phase.name}</div>
                                  </div>
                                  {(phase as any).description &&
                                   !phase.name.includes((phase as any).description) && (
                                    <p className="text-xs text-gray-300 text-left">{(phase as any).description}</p>
                                  )}
                                </div>
                                {phase.parcels.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 auto-rows-max">
                                    {phase.parcels.map((parcel) => {
                                      const isEditing =
                                        editing && editing.areaId === area.id && editing.phaseId === phase.id && editing.parcelId === parcel.id
                                      const tileColor = getLandUseColor(parcel.landUse)
                                      const borderColor = getLandUseBorderColor(parcel.landUse)
                                      const tileDisplayCode = parcel.family_name || parcel.landuseCode || parcel.landUse

                                      return (
                                        <div
                                          key={parcel.id}
                                          className={`${tileColor} ${borderColor} text-white rounded text-xs cursor-pointer border hover:outline hover:outline-2 transition-all duration-200 overflow-hidden ${isEditing ? 'col-span-2 p-2 min-h-48' : 'p-1.5'}`}
                                          style={{outlineColor: 'rgb(33,88,226)'}}
                                          onClick={(e) => {
                                            if (!isEditing) {
                                              e.stopPropagation()
                                              startEditingParcel(area.id, phase.id, parcel.id)
                                            }
                                          }}
                                        >
                                          {isEditing && (
                                            <div
                                              className="p-1 bg-gray-800 bg-opacity-90"
                                              onClick={(e) => e.stopPropagation()}
                                              onMouseDown={(e) => e.stopPropagation()}
                                            >
                                              <div className="text-center mb-2">
                                                <div className="font-semibold text-xs leading-tight mb-0.5">
                                                  Parcel {parcel.name.replace('Parcel: ', '')}
                                                </div>
                                              </div>
                                              <InlineTaxonomySelector
                                                value={{
                                                  family_name: draft.family_name,
                                                  density_code: draft.density_code,
                                                  type_code: draft.type_code,
                                                  product_code: draft.product_code,
                                                }}
                                                onChange={(values) => setDraft((prev) => ({ ...prev, ...values }))}
                                              />
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  <tr>
                                                    <td className="opacity-90 align-top pr-1 w-12">Acres:</td>
                                                    <td className="font-medium w-16">
                                                      <input
                                                        type="number"
                                                        step="0.1"
                                                        value={draft.acres || ''}
                                                        onChange={(e) => setDraft((prev) => ({ ...prev, acres: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
                                                        placeholder="Acres"
                                                      />
                                                    </td>
                                                  </tr>
                                                  {draft.family_name !== 'Commercial' && (
                                                    <tr>
                                                      <td className="opacity-90 align-top pr-1">Units:</td>
                                                      <td className="font-medium">
                                                        <input
                                                          type="text"
                                                          value={draft.units}
                                                          onChange={(e) => setDraft((prev) => ({ ...prev, units: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                                          className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
                                                        />
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                              <div className="flex gap-1 justify-end mt-2">
                                                <button
                                                  className="px-2 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    cancelEdit()
                                                  }}
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    saveInlineEdit()
                                                  }}
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                          {!isEditing && (
                                            <>
                                              <div className="text-center mb-2">
                                                <div className="font-semibold text-xs leading-tight mb-0.5">
                                                  Parcel {parcel.name.replace('Parcel: ', '')}
                                                </div>
                                              </div>
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  <tr>
                                                    <td className="opacity-90 align-top pr-1 w-12">Family:</td>
                                                    <td className="font-medium w-16">{parcel.family_name || parcel.landUse}</td>
                                                  </tr>
                                                  {parcel.type_code && (
                                                    <tr>
                                                      <td className="opacity-90 align-top pr-1">Type:</td>
                                                      <td className="font-medium">{parcel.type_code}</td>
                                                    </tr>
                                                  )}
                                                  {/* Product row - now positioned after Type */}
                                                  {parcel.product_code && (
                                                    <tr>
                                                      <td className="opacity-90 align-top pr-1">Product:</td>
                                                      <td className="font-medium">{parcel.product_code}</td>
                                                    </tr>
                                                  )}
                                                  <tr>
                                                    <td className="opacity-90 align-top pr-1">Acres:</td>
                                                    <td className="font-medium">{parcel.acres}</td>
                                                  </tr>
                                                  {parcel.family_name !== 'Commercial' && (
                                                    <tr>
                                                      <td className="opacity-90 align-top pr-1">Units:</td>
                                                      <td className="font-medium">{parcel.units || 0}</td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                              <div className="text-center text-xs text-gray-300 opacity-70 mt-2">Click to edit</div>
                                            </>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* New Parcel Tile for Inline Creation */}
                                {addingParcel && addingParcel.areaId === area.id && addingParcel.phaseId === phase.id && (
                                  <div
                                    className="bg-gray-600 border-gray-500 text-white rounded text-xs cursor-pointer border hover:outline hover:outline-2 transition-all duration-200 overflow-hidden col-span-2 p-2 min-h-48"
                                    style={{outlineColor: 'rgb(33,88,226)'}}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div
                                      className="p-2 text-white min-h-48"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between text-sm font-semibold mb-3">
                                        <span>New Parcel</span>
                                        <span className="text-xs uppercase tracking-wide opacity-80">NEW</span>
                                      </div>
                                      <div className="space-y-4">
                                        <SimpleTaxonomySelector
                                          value={{
                                            family_name: newParcelDraft.family_name,
                                            density_code: newParcelDraft.density_code,
                                            type_code: newParcelDraft.type_code,
                                            product_code: newParcelDraft.product_code,
                                          }}
                                          onChange={(values) => setNewParcelDraft((prev) => ({ ...prev, ...values }))}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Acres</label>
                                            <input
                                              type="text"
                                              pattern="[0-9]*\.?[0-9]*"
                                              className="w-full rounded border border-gray-500 bg-white px-2 py-1 text-sm text-black"
                                              value={newParcelDraft.acres}
                                              onChange={(e) => setNewParcelDraft((prev) => ({ ...prev, acres: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                            />
                                          </div>

                                          {/* Only show Units for non-commercial families */}
                                          {newParcelDraft.family_name !== 'Commercial' && (
                                            <div>
                                              <label className="block text-sm font-medium text-gray-300 mb-1">Units</label>
                                              <input
                                                type="text"
                                                pattern="[0-9]*"
                                                className="w-full rounded border border-gray-500 bg-white px-2 py-1 text-sm text-black"
                                                value={newParcelDraft.units}
                                                onChange={(e) => setNewParcelDraft((prev) => ({ ...prev, units: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                    <div className="flex justify-end gap-2 mt-4">
                                      <button
                                        className="px-3 py-1 text-xs border border-gray-500 text-gray-200 rounded hover:bg-gray-700"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          cancelAddParcel()
                                        }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          saveNewParcel(area.id, phase.id)
                                        }}
                                      >
                                        Save
                                      </button>
                                    </div>
                                    </div>
                                  </div>
                                )}

                                {/* Add Parcel Button */}
                                <div className="mt-3 pt-2 border-t border-gray-600">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startAddingParcel(area.id, phase.id)
                                    }}
                                    disabled={addingParcel !== null}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center gap-1"
                                  >
                                    <span className="text-sm">+</span>
                                    Add Parcel
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DropZone>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}

export default ProjectCanvas
