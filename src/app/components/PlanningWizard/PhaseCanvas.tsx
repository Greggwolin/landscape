'use client'

import React, { useState, useEffect } from 'react'
import { Project, Area, Phase, Parcel, LandUseType } from './PlanningWizard'
import DropZone from './DropZone'
import ParcelForm from './forms/ParcelForm'
import NavigationTiles from './NavigationTiles'

interface PhaseCanvasProps {
  project: Project
  area: Area
  phase: Phase
  onAddParcel: (areaId: string, phaseId: string, parcelData: Omit<Parcel, 'id'>) => void
  onOpenParcel?: (areaId: string, phaseId: string, parcelId: string) => void
  onOpenPhase?: (areaId: string, phaseId: string) => void
  onBack: () => void
  onNavigateToArea?: (areaId: string) => void
  onAddPhase?: (areaId: string) => void
}

const PhaseCanvas: React.FC<PhaseCanvasProps> = ({
  project,
  area,
  phase,
  onAddParcel,
  onOpenParcel,
  onOpenPhase,
  onBack,
  onNavigateToArea,
  onAddPhase
}) => {
  const [showParcelForm, setShowParcelForm] = useState(false)

  // 'A' key handling to navigate back to Area page
  useEffect(() => {
    const handleAKey = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') {
        if (!showParcelForm && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Only trigger if no forms are open and no modifier keys
          const target = e.target as HTMLElement
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            return // Don't trigger if user is typing in a form field
          }
          e.preventDefault()
          e.stopPropagation()
          onBack()
        }
      }
    }

    document.addEventListener('keydown', handleAKey, true)
    return () => {
      document.removeEventListener('keydown', handleAKey, true)
    }
  }, [showParcelForm, onBack])


  const handleDropParcel = (item: { type: string }) => {
    if (item.type === 'parcel') {
      setShowParcelForm(true)
    }
  }

  const handleAddParcel = () => {
    setShowParcelForm(true)
  }

  const handleParcelFormSubmit = (parcelData: Omit<Parcel, 'id'>) => {
    onAddParcel(area.id, phase.id, parcelData)
    setShowParcelForm(false)
  }

  const handleParcelFormCancel = () => {
    setShowParcelForm(false)
  }

  const getLandUseColor = (landUse: LandUseType) => {
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

  const getLandUseBorderColor = (landUse: LandUseType) => {
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
          {/* Header with Navigation Tiles */}
          <div className="border-b border-gray-700 p-4">
            <NavigationTiles
              project={project}
              currentArea={area}
              currentPhase={phase}
              onNavigateToProject={onBack}
              onNavigateToArea={onNavigateToArea}
              onNavigateToPhase={onOpenPhase}
              onAddPhase={onAddPhase}
              onAddParcel={handleAddParcel}
              showProjectTile={false}
            />
          </div>
          
          {/* Phase Canvas */}
          <div className="p-6 h-full bg-gray-900">
            {/* Phase Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">{phase.name}</h2>
              {(phase as any).description && (
                <p className="text-sm text-gray-300 mt-1">{(phase as any).description}</p>
              )}
            </div>
            
            <DropZone
              accepts={['parcel']}
              onDrop={handleDropParcel}
              className="w-full h-96 bg-gray-700 border-2 border-solid border-gray-600 rounded-lg"
            >
              <div className="p-4 grid grid-cols-3 gap-4 h-full overflow-y-auto">
                {phase.parcels.map((parcel) => (
                  <div
                    key={parcel.id}
                    className={`${getLandUseColor(parcel.landUse)} ${getLandUseBorderColor(parcel.landUse)} text-white border-2 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-white transition-all duration-200 h-fit`}
                    onClick={() => {
                      if (onOpenParcel) {
                        onOpenParcel(area.id, phase.id, parcel.id)
                      }
                    }}
                  >
                    <div className="text-center mb-2">
                      <div className="font-bold text-sm mb-1 leading-tight">
                        Parcel {parcel.name.replace('Parcel: ', '')}
                      </div>
                      {(parcel as any).description && (
                        <p className="text-xs text-gray-100 opacity-90 mb-2">{(parcel as any).description}</p>
                      )}
                      {parcel.notes && (
                        <p className="text-xs text-gray-200 opacity-80 italic">{parcel.notes}</p>
                      )}
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="opacity-90 align-top pr-2 w-16">Use:</td>
                          <td className="font-semibold w-20">{parcel.landUse}</td>
                        </tr>
                        <tr>
                          <td className="opacity-90 align-top pr-2">Acres:</td>
                          <td className="font-semibold">{parcel.acres}</td>
                        </tr>
                        {parcel.units > 0 && (
                          <tr>
                            <td className="opacity-90 align-top pr-2">Units:</td>
                            <td className="font-semibold">{parcel.units}</td>
                          </tr>
                        )}
                        {(parcel.frontage ?? 0) > 0 && (
                          <tr>
                            <td className="opacity-90 align-top pr-2">Frontage:</td>
                            <td className="font-semibold">{parcel.frontage} ft</td>
                          </tr>
                        )}
                        {Boolean(parcel.product) && (
                          <tr>
                            <td className="opacity-90 align-top pr-2">Product:</td>
                            <td className="font-semibold">{parcel.product}</td>
                          </tr>
                        )}
                        {Boolean(parcel.status) && (
                          <tr>
                            <td className="opacity-90 align-top pr-2">Status:</td>
                            <td className="font-semibold">{parcel.status}</td>
                          </tr>
                        )}
                        {(parcel.efficiency ?? 0) > 0 && (
                          <tr>
                            <td className="opacity-90 align-top pr-2">Efficiency:</td>
                            <td className="font-semibold">{(parcel.efficiency * 100).toFixed(0)}%</td>
                          </tr>
                        )}
                        {(parcel.density_gross ?? 0) > 0 && (
                          <tr>
                            <td className="opacity-90 align-top pr-2">Density:</td>
                            <td className="font-semibold">{parcel.density_gross.toFixed(1)} u/ac</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </DropZone>
          </div>
        </div>
      </div>

      {/* Parcel Form Modal */}
      {showParcelForm && (
        <ParcelForm
          areaName={area.name}
          phaseName={phase.name}
          onSubmit={handleParcelFormSubmit}
          onCancel={handleParcelFormCancel}
        />
      )}
    </div>
  )
}

export default PhaseCanvas
