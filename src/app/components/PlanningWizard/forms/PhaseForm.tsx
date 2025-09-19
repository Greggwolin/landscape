'use client'

import React, { useState, useEffect } from 'react'

interface PhaseFormProps {
  areaName: string
  onSubmit: (phaseData: { name: string; description: string }) => void
  onCancel: () => void
  suggestedName?: string
}

const PhaseForm: React.FC<PhaseFormProps> = ({
  areaName,
  onSubmit,
  onCancel,
  suggestedName
}) => {
  const [formData, setFormData] = useState({
    name: suggestedName || '',
    description: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  // Track if form has any values
  useEffect(() => {
    const hasValues = formData.name || formData.description
    setHasChanges(Boolean(hasValues))
  }, [formData])

  // ESC key handling
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      console.log('PhaseForm - Key pressed:', e.key, 'hasChanges:', hasChanges)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (hasChanges) {
          setShowExitDialog(true)
        } else {
          onCancel()
        }
      }
    }

    console.log('PhaseForm - Adding ESC key listener')
    document.addEventListener('keydown', handleEscKey, true)
    return () => {
      console.log('PhaseForm - Removing ESC key listener')
      document.removeEventListener('keydown', handleEscKey, true)
    }
  }, [hasChanges, onCancel])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Phase name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim()
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{areaName}: {suggestedName || 'Phase'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Phase Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phase Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="<Required>"
                autoFocus
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="<Add>"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Phase
            </button>
          </div>
        </form>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96">
            <div className="border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Unsaved Changes</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">You have unsaved data. What would you like to do?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    setShowExitDialog(false)
                    onCancel()
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Exit Without Saving
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhaseForm