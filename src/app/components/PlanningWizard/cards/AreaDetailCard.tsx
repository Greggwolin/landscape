'use client'

import React, { useState, useEffect } from 'react'
import { Area } from '../PlanningWizard'

interface AreaDetailCardProps {
  area: Area | null
  isOpen: boolean
  onSave: (areaId: string, updates: { name: string; description: string }) => void
  onClose: () => void
  onDelete?: (areaId: string) => void
}

const AreaDetailCard: React.FC<AreaDetailCardProps> = ({
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
  
  const [hasChanges, setHasChanges] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  useEffect(() => {
    if (area) {
      console.log('AreaDetailCard - Initializing form data for area:', area)
      setFormData({
        name: area.name,
        description: (area as any).description || ''
      })
      setHasChanges(false)
    }
  }, [area])

  // Track form changes
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    const originalName = area?.name || ''
    const originalDescription = (area as any)?.description || ''
    
    const newData = { ...formData, [field]: value }
    const hasChangedData = newData.name !== originalName || newData.description !== originalDescription
    console.log('AreaDetailCard - Form change:', { field, value, originalName, originalDescription, newData, hasChangedData })
    setHasChanges(hasChangedData)
  }

  // ESC key handling
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      console.log('AreaDetailCard - Key pressed:', e.key, 'isOpen:', isOpen, 'hasChanges:', hasChanges)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (hasChanges) {
          console.log('AreaDetailCard - Showing exit dialog due to changes')
          setShowExitDialog(true)
        } else {
          console.log('AreaDetailCard - Closing without changes')
          onClose()
        }
      }
    }

    if (isOpen) {
      console.log('AreaDetailCard - Adding ESC key listener after delay')
      // Add a small delay to ensure the component is fully initialized
      const timeoutId = setTimeout(() => {
        document.addEventListener('keydown', handleEscKey, true)
      }, 100)
      
      return () => {
        console.log('AreaDetailCard - Removing ESC key listener')
        clearTimeout(timeoutId)
        document.removeEventListener('keydown', handleEscKey, true)
      }
    }
  }, [isOpen, hasChanges, onClose])

  const handleSave = () => {
    if (area) {
      onSave(area.id, formData)
      onClose()
    }
  }

  const handleCancel = () => {
    if (area) {
      setFormData({
        name: area.name,
        description: (area as any).description || ''
      })
    }
    onClose()
  }

  if (!area) return null

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
          <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Area Details</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Area Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Area Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Area 1"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter area description..."
                />
              </div>

              {/* Summary Info */}
              <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
                <h4 className="font-medium text-sm text-gray-300 mb-2">Area Summary</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Phases: {area.phases.length}</div>
                  <div>Total Parcels: {area.phases.reduce((sum, phase) => sum + phase.parcels.length, 0)}</div>
                  <div>Total Units: {area.phases.reduce((sum, phase) => 
                    sum + phase.parcels.reduce((pSum, parcel) => pSum + parcel.units, 0), 0
                  )}</div>
                  <div>Total Acres: {area.phases.reduce((sum, phase) => 
                    sum + phase.parcels.reduce((pSum, parcel) => pSum + parcel.acres, 0), 0
                  ).toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4 flex justify-between">
            <div>
              {onDelete && area && (
                <button
                  onClick={() => onDelete(area.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete Area
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
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96">
            <div className="border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Unsaved Changes</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">You have unsaved changes. What would you like to do?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowExitDialog(false)
                    onClose()
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Exit Without Saving
                </button>
                <button
                  onClick={() => {
                    handleSave()
                    setShowExitDialog(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Save & Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AreaDetailCard