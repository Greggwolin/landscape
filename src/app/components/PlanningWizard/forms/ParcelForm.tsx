'use client'

import React, { useState, useEffect } from 'react'
import { LandUseType, Parcel } from '../PlanningWizard'

interface ParcelFormProps {
  areaName: string
  phaseName: string
  onSubmit: (parcelData: Omit<Parcel, 'id'>) => void
  onCancel: () => void
}

const landUseOptions: { value: LandUseType; label: string; densityRange: string }[] = [
  { value: 'LDR', label: 'Low Density Residential', densityRange: '1-3 units/acre' },
  { value: 'MDR', label: 'Medium Density Residential', densityRange: '4-8 units/acre' },
  { value: 'HDR', label: 'High Density Residential', densityRange: '12-25 units/acre' },
  { value: 'MHDR', label: 'Very High Density Residential', densityRange: '25+ units/acre' },
  { value: 'C', label: 'Commercial', densityRange: 'N/A' },
  { value: 'MU', label: 'Mixed Use', densityRange: 'Variable' },
  { value: 'OS', label: 'Open Space', densityRange: 'N/A' },
]

const ParcelForm: React.FC<ParcelFormProps> = ({
  areaName,
  phaseName,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    landUse: 'MDR' as LandUseType,
    acres: '',
    units: '',
    frontage: '',
    product: '',
    status: 'Planned',
    description: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  // Track if form has any values
  useEffect(() => {
    const hasValues = formData.acres || formData.units || formData.frontage || formData.product || formData.description || formData.notes
    setHasChanges(Boolean(hasValues))
  }, [formData])

  // ESC key handling
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      console.log('ParcelForm - Key pressed:', e.key, 'hasChanges:', hasChanges)
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

    console.log('ParcelForm - Adding ESC key listener')
    document.addEventListener('keydown', handleEscKey, true)
    return () => {
      console.log('ParcelForm - Removing ESC key listener')
      document.removeEventListener('keydown', handleEscKey, true)
    }
  }, [hasChanges, onCancel])

  const calculateDensity = () => {
    const acres = parseFloat(formData.acres) || 0
    const units = parseInt(formData.units) || 0
    return acres > 0 ? (units / acres).toFixed(2) : '0'
  }

  const getEstimatedUnits = (landUse: LandUseType, acres: number) => {
    const densityMap: Record<LandUseType, number> = {
      'LDR': 2,
      'MDR': 6,
      'HDR': 18,
      'MHDR': 30,
      'C': 0,
      'MU': 15,
      'OS': 0
    }
    return Math.round(acres * densityMap[landUse])
  }

  const handleLandUseChange = (landUse: LandUseType) => {
    const acres = parseFloat(formData.acres) || 0
    const estimatedUnits = acres > 0 ? getEstimatedUnits(landUse, acres) : 0
    
    setFormData({
      ...formData,
      landUse,
      units: estimatedUnits.toString()
    })
  }

  const handleAcresChange = (acres: string) => {
    const acresValue = parseFloat(acres) || 0
    const estimatedUnits = acresValue > 0 ? getEstimatedUnits(formData.landUse, acresValue) : 0
    
    setFormData({
      ...formData,
      acres,
      units: ['C', 'OS'].includes(formData.landUse) ? '0' : estimatedUnits.toString()
    })
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.acres || parseFloat(formData.acres) <= 0) {
      newErrors.acres = 'Acres must be greater than 0'
    }

    if (!formData.units || parseInt(formData.units) < 0) {
      newErrors.units = 'Units must be 0 or greater'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    const parcelData = {
      name: '', // Will be auto-generated
      landUse: formData.landUse,
      acres: parseFloat(formData.acres),
      units: parseInt(formData.units),
      frontage: formData.frontage ? parseFloat(formData.frontage) : undefined,
      product: formData.product || undefined,
      status: formData.status,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
      // Calculate additional fields  
      efficiency: 0.85, // Typical efficiency assumption (net acres / gross acres)
      density_gross: formData.acres && formData.units ? parseInt(formData.units) / parseFloat(formData.acres) : undefined,
      ff_per_acre: formData.frontage && formData.acres ? parseFloat(formData.frontage) / parseFloat(formData.acres) : undefined
    }
    
    onSubmit(parcelData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Add Parcel</h2>
          <p className="text-sm text-gray-400 mt-1">
            {areaName} • {phaseName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Land Use Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Land Use Type
              </label>
              <select
                value={formData.landUse}
                onChange={(e) => handleLandUseChange(e.target.value as LandUseType)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {landUseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.densityRange})
                  </option>
                ))}
              </select>
            </div>

            {/* Acres */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Acres
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.acres}
                onChange={(e) => handleAcresChange(e.target.value)}
                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.acres ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="<Required>"
              />
              {errors.acres && (
                <p className="text-red-400 text-xs mt-1">{errors.acres}</p>
              )}
            </div>

            {/* Units */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Units
              </label>
              <input
                type="number"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.units ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="<Required>"
                disabled={['OS'].includes(formData.landUse)}
              />
              {errors.units && (
                <p className="text-red-400 text-xs mt-1">{errors.units}</p>
              )}
              {formData.acres && formData.units && !['C', 'OS'].includes(formData.landUse) && (
                <p className="text-gray-400 text-xs mt-1">
                  Density: {calculateDensity()} units/acre
                </p>
              )}
            </div>

            {/* Two-column layout for additional fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Frontage */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Frontage (ft)
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.frontage}
                  onChange={(e) => setFormData({ ...formData, frontage: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="<Add>"
                />
              </div>

              {/* Product */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Product Type
                </label>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="<Add>"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Planned">Planned</option>
                <option value="In Design">In Design</option>
                <option value="Approved">Approved</option>
                <option value="Under Construction">Under Construction</option>
                <option value="Complete">Complete</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="<Add>"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="<Add>"
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-700 border border-gray-600 rounded-md p-3 mt-4">
              <h4 className="font-medium text-sm text-gray-300 mb-2">Summary</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Area: {areaName}</div>
                <div>Phase: {phaseName}</div>
                <div>Land Use: {landUseOptions.find(opt => opt.value === formData.landUse)?.label}</div>
                <div>Acres: {formData.acres || '0'}</div>
                <div>Units: {formData.units || '0'}</div>
                {formData.frontage && <div>Frontage: {formData.frontage} ft</div>}
                {formData.product && <div>Product: {formData.product}</div>}
                <div>Status: {formData.status}</div>
                {formData.acres && formData.units && !['C', 'OS'].includes(formData.landUse) && (
                  <div>Density: {calculateDensity()} units/acre</div>
                )}
              </div>
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
              Add Parcel
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

export default ParcelForm