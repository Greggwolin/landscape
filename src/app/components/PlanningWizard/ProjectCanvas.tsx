'use client'

import React from 'react'
import { Project } from './PlanningWizard'
import DropZone from './DropZone'

interface ProjectCanvasProps {
  project: Project
  onAddArea: () => void
  onAddPhase: (areaId: string) => void
  onOpenPhase: (areaId: string, phaseId: string) => void
  onOpenArea: (areaId: string) => void
  onOpenParcel?: (areaId: string, phaseId: string, parcelId: string) => void
  showAreaForm?: boolean
  showPhaseForm?: { areaId: string; areaName: string } | null
  openDetailCard?: { type: string; entityId?: string } | null
}

const ProjectCanvas: React.FC<ProjectCanvasProps> = ({
  project,
  onAddArea,
  onAddPhase,
  onOpenPhase,
  onOpenArea,
  onOpenParcel,
  showAreaForm: _showAreaForm,
  showPhaseForm,
  openDetailCard
}) => {
  const handlePhaseDrop = (areaId: string) => (item: { type: string }) => {
    if (item.type === 'phase') {
      onAddPhase(areaId)
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

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 bg-gray-950">
        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
          {/* Header */}
          <div className="border-b border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">{project.name}</h2>
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onAddArea}
                className="px-4 py-2 bg-gray-600 border-2 border-solid border-gray-500 text-white rounded-lg font-medium hover:outline hover:outline-2 transition-all duration-200"
                style={{outlineColor: 'rgb(33,88,226)'}}
              >
                Add Area
              </button>
            </div>
          </div>
          
          {/* Canvas Area */}
          <div className="p-6 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
                {project.areas.map((area) => (
                  <div key={area.id} className="min-h-[520px]">
                    <DropZone
                      accepts={['phase']}
                      onDrop={handlePhaseDrop(area.id)}
                      className="min-h-full"
                    >
                      <div 
                        className="min-h-full rounded-lg p-4 bg-slate-600 cursor-pointer border-2 border-slate-400 border-solid transition-all duration-200 group"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenArea(area.id);
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
                                e.stopPropagation();
                                onAddPhase(area.id);
                              }}
                              className="px-4 py-2 bg-gray-600 border-2 border-solid border-gray-500 text-white rounded-lg font-medium hover:outline hover:outline-2 transition-all duration-200"
                              style={{outlineColor: 'rgb(33,88,226)'}}
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
                                  e.stopPropagation();
                                  onOpenPhase(area.id, phase.id);
                                }}
                                className={`bg-slate-700 rounded p-3 cursor-pointer border-2 ${
                                  ((showPhaseForm?.areaId === area.id) || 
                                   (openDetailCard?.type === 'phase' && openDetailCard?.entityId === phase.id))
                                    ? 'border-dashed border-slate-400'
                                    : 'border-solid border-gray-500'
                                } hover:border-blue-400 transition-all duration-200`}
                              >
                                <div className="mb-2">
                                  <div className="mb-1">
                                    <div className="font-medium text-sm text-white">
                                      {phase.name}
                                    </div>
                                  </div>
                                  {(phase as any).description && (
                                    <p className="text-xs text-gray-300 text-left">{(phase as any).description}</p>
                                  )}
                                </div>
                                {phase.parcels.length > 0 && (
                                  <div className="grid grid-cols-3 gap-1">
                                    {phase.parcels.map((parcel) => (
                                      <div
                                        key={parcel.id}
                                        className={`${getLandUseColor(parcel.landUse)} ${getLandUseBorderColor(parcel.landUse)} text-white rounded text-xs p-1.5 cursor-pointer border hover:outline hover:outline-2 transition-all duration-200`}
                                        style={{outlineColor: 'rgb(33,88,226)'}}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onOpenParcel) {
                                            onOpenParcel(area.id, phase.id, parcel.id);
                                          }
                                        }}
                                      >
                                        <div className="text-center mb-2">
                                          <div className="font-semibold text-xs leading-tight mb-0.5">
                                            Parcel {parcel.name.replace('Parcel: ', '')}
                                          </div>
                                          {(parcel as any).description && (
                                            <p className="text-xs text-gray-100 opacity-90">{(parcel as any).description}</p>
                                          )}
                                        </div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            <tr>
                                              <td className="opacity-90 align-top pr-1 w-12">Use:</td>
                                              <td className="font-medium w-16">{parcel.landUse}</td>
                                            </tr>
                                            <tr>
                                              <td className="opacity-90 align-top pr-1">Acres:</td>
                                              <td className="font-medium">{parcel.acres}</td>
                                            </tr>
                                            {parcel.units > 0 && (
                                              <tr>
                                                <td className="opacity-90 align-top pr-1">Units:</td>
                                                <td className="font-medium">{parcel.units}</td>
                                              </tr>
                                            )}
                                            {(parcel.frontage ?? 0) > 0 && (
                                              <tr>
                                                <td className="opacity-90 align-top pr-1">Frontage:</td>
                                                <td className="font-medium">{parcel.frontage} ft</td>
                                              </tr>
                                            )}
                                            {parcel.product && (
                                              <tr>
                                                <td className="opacity-90 align-top pr-1">Product:</td>
                                                <td className="font-medium">{parcel.product}</td>
                                              </tr>
                                            )}
                                            {Boolean(parcel.status) && (
                                              <tr>
                                                <td className="opacity-90 align-top pr-1">Status:</td>
                                                <td className="font-medium">{parcel.status}</td>
                                              </tr>
                                            )}
                                            {(parcel.efficiency ?? 0) > 0 && (
                                              <tr>
                                                <td className="opacity-90 align-top pr-1">Efficiency:</td>
                                                <td className="font-medium">{(parcel.efficiency * 100).toFixed(0)}%</td>
                                              </tr>
                                            )}
                                            {(parcel.density_gross ?? 0) > 0 && (
                                              <tr>
                                                <td className="opacity-90 align-top pr-1">Density:</td>
                                                <td className="font-medium">{parcel.density_gross.toFixed(1)} u/ac</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    ))}
                                    
                                  </div>
                                )}
                              </div>
                              ))}
                            </div>
                            {/* Area Action Chips */}
                            <div className="flex gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddPhase(area.id);
                                }}
                                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium transition-all duration-200"
                              >
                                + Add Phase
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to most recent phase or create one if none exist
                                  if (area.phases.length > 0) {
                                    const lastPhase = area.phases[area.phases.length - 1];
                                    onOpenPhase(area.id, lastPhase.id);
                                  } else {
                                    onAddPhase(area.id);
                                  }
                                }}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-all duration-200"
                              >
                                + Add / Manage Parcels
                              </button>
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
