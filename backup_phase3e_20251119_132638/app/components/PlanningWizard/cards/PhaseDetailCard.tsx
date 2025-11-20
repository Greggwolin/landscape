'use client'

import React, { useState, useEffect } from 'react'
import { Phase, Area } from '../PlanningWizard'

interface PhaseDetailCardProps {
  phase: Phase | null
  area: Area | null
  isOpen: boolean
  onSave: (areaId: string, phaseId: string, updates: { name: string; description: string }) => void
  onClose: () => void
  onDelete?: (areaId: string, phaseId: string) => void
}

const PhaseDetailCard: React.FC<PhaseDetailCardProps> = ({
  phase,
  area,
  isOpen,
  onSave,
  onClose,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (phase) {
      setFormData({
        name: phase.name,
        description: (phase as any).description || ''
      })
    }
  }, [phase])

  const handleSave = () => {
    if (phase && area) {
      onSave(area.id, phase.id, formData)
      onClose()
    }
  }

  const handleCancel = () => {
    if (phase) {
      setFormData({
        name: phase.name,
        description: (phase as any).description || ''
      })
    }
    onClose()
  }

  if (!phase || !area) return null

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Slide-out card */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Phase Details</h2>
              <p className="text-sm text-blue-100">{area.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Phase Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phase Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phase 1.1"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phase description..."
                />
              </div>

              {/* Phase Summary */}
              <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
                <h4 className="font-medium text-sm text-gray-300 mb-2">Phase Summary</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Area: {area.name}</div>
                  <div>Parcels: {phase.parcels.length}</div>
                  <div>Total Units: {phase.parcels.reduce((sum, parcel) => sum + parcel.units, 0)}</div>
                  <div>Total Acres: {phase.parcels.reduce((sum, parcel) => sum + parcel.acres, 0).toFixed(1)}</div>
                  {phase.parcels.length > 0 && (
                    <div>Density: {(
                      phase.parcels.reduce((sum, parcel) => sum + parcel.units, 0) /
                      phase.parcels.reduce((sum, parcel) => sum + parcel.acres, 0)
                    ).toFixed(2)} units/acre</div>
                  )}
                </div>
              </div>

              {/* Land Use Breakdown */}
              {phase.parcels.length > 0 && (
                <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
                  <h4 className="font-medium text-sm text-gray-300 mb-2">Land Use Breakdown</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    {Object.entries(
                      phase.parcels.reduce((acc, parcel) => {
                        acc[parcel.landUse] = (acc[parcel.landUse] || 0) + parcel.acres
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([landUse, acres]) => (
                      <div key={landUse} className="flex justify-between">
                        <span>{landUse}:</span>
                        <span>{acres.toFixed(1)} acres</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4 flex justify-between">
            <div>
              {onDelete && area && phase && (
                <button
                  onClick={() => onDelete(area.id, phase.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete Phase
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default PhaseDetailCard