'use client'

import React, { useState, useEffect } from 'react'
import { Project, Area, Phase, Parcel, LandUseType } from './PlanningWizard'
import DropZone from './DropZone'
import ParcelForm from './forms/ParcelForm'
import NavigationTiles from './NavigationTiles'
import ParcelTile from './ParcelTile'

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
              <div className="p-4 grid gap-4 h-full overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {phase.parcels.map((parcel) => (
                  <ParcelTile
                    key={parcel.id}
                    parcel={parcel}
                    mode="view"
                    onClick={() => {
                      if (onOpenParcel) {
                        onOpenParcel(area.id, phase.id, parcel.id)
                      }
                    }}
                  />
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
          projectId={phase.projectId}
          areaId={area.dbId}
          phaseId={phase.dbId}
          onSubmit={handleParcelFormSubmit}
          onCancel={handleParcelFormCancel}
        />
      )}
    </div>
  )
}

export default PhaseCanvas
