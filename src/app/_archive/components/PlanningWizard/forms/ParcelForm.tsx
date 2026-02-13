'use client'

import React, { useState, useEffect } from 'react'
import { LandUseType, Parcel } from '../PlanningWizard'
import TaxonomySelector from '../../LandUse/TaxonomySelector'
import { TaxonomySelection } from '../../../../types/landuse'

interface ParcelFormProps {
  areaName: string
  phaseName: string
  projectId?: number
  areaId?: number
  phaseId?: number
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
  projectId,
  areaId,
  phaseId,
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
    notes: '',
    // New taxonomy fields
    family_name: '',
    density_code: '',
    type_code: '',
    product_code: '',
    // New non-residential fields
    building_sf: '',
    site_coverage_pct: '',
    setback_front_ft: '',
    setback_side_ft: '',
    setback_rear_ft: ''
  })

  // Separate state for taxonomy selection
  const [taxonomySelection, setTaxonomySelection] = useState<TaxonomySelection>({
    family_name: '',
    density_code: '',
    type_code: '',
    product_code: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

    // Basic field validation
    if (!formData.acres || parseFloat(formData.acres) <= 0) {
      newErrors.acres = 'Acres must be greater than 0'
    }

    if (!formData.units || parseInt(formData.units) < 0) {
      newErrors.units = 'Units must be 0 or greater'
    }

    // Taxonomy validation
    if (formData.family_name && !formData.type_code) {
      newErrors.taxonomy = 'Please select a land use type when family is specified'
    }

    if (formData.type_code && !formData.family_name) {
      newErrors.taxonomy = 'Please select a family when type is specified'
    }

    // Density validation for residential uses
    if (formData.family_name === 'Residential' && formData.density_code) {
      const density = parseFloat(formData.acres) > 0 && parseInt(formData.units) > 0
        ? parseInt(formData.units) / parseFloat(formData.acres)
        : 0

      // Basic density range validation for common codes
      const densityRanges: Record<string, { min: number; max: number }> = {
        'VLDR': { min: 0.1, max: 1 },
        'LDR': { min: 1, max: 3 },
        'MDR': { min: 4, max: 8 },
        'HDR': { min: 12, max: 25 },
        'VHDR': { min: 25, max: 100 }
      }

      const range = densityRanges[formData.density_code]
      if (range && density > 0 && (density < range.min || density > range.max)) {
        newErrors.density = `Calculated density (${density.toFixed(2)} units/acre) does not match ${formData.density_code} range (${range.min}-${range.max} units/acre)`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSaving(true)
    setErrors({})

    try {
      // If we have the required IDs, save to database
      if (projectId && areaId && phaseId) {
        const requestBody = {
          project_id: projectId,
          area_id: areaId,
          phase_id: phaseId,
          landuse_code: formData.landUse, // Legacy field for backward compatibility
          acres_gross: parseFloat(formData.acres),
          units_total: parseInt(formData.units),
          lot_product: formData.product || null,
          plan_efficiency: formData.frontage && formData.acres ? 0.85 : null, // Default efficiency
          lots_frontfeet: formData.frontage ? parseFloat(formData.frontage) : null,
          description: formData.description || null,
          notes: formData.notes || null,
          // New taxonomy fields
          family_name: formData.family_name || null,
          density_code: formData.density_code || null,
          type_code: formData.type_code || null,
          product_code: formData.product_code || null,
          // New non-residential fields
          building_sf: formData.building_sf ? parseInt(formData.building_sf) : null,
          site_coverage_pct: formData.site_coverage_pct ? parseInt(formData.site_coverage_pct) : null,
          setback_front_ft: formData.setback_front_ft ? parseInt(formData.setback_front_ft) : null,
          setback_side_ft: formData.setback_side_ft ? parseInt(formData.setback_side_ft) : null,
          setback_rear_ft: formData.setback_rear_ft ? parseInt(formData.setback_rear_ft) : null
        }

        const response = await fetch('/api/parcels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save parcel')
        }

        const savedParcel = await response.json()
        console.log('✅ Parcel saved to database:', savedParcel)

        // Create parcel data for local state update
        const parcelData = {
          name: savedParcel.parcel_name || `Parcel ${savedParcel.parcel_id}`,
          landUse: formData.landUse,
          acres: parseFloat(formData.acres),
          units: parseInt(formData.units),
          frontage: formData.frontage ? parseFloat(formData.frontage) : undefined,
          product: formData.product || undefined,
          status: formData.status,
          description: formData.description || undefined,
          notes: formData.notes || undefined,
          // New taxonomy fields
          family_name: formData.family_name || undefined,
          density_code: formData.density_code || undefined,
          type_code: formData.type_code || undefined,
          product_code: formData.product_code || undefined,
          // New non-residential fields
          building_sf: formData.building_sf ? parseInt(formData.building_sf) : undefined,
          site_coverage_pct: formData.site_coverage_pct ? parseInt(formData.site_coverage_pct) : undefined,
          setback_front_ft: formData.setback_front_ft ? parseInt(formData.setback_front_ft) : undefined,
          setback_side_ft: formData.setback_side_ft ? parseInt(formData.setback_side_ft) : undefined,
          setback_rear_ft: formData.setback_rear_ft ? parseInt(formData.setback_rear_ft) : undefined,
          // Database fields
          dbId: savedParcel.parcel_id,
          efficiency: savedParcel.efficiency || 0.85,
          density_gross: formData.acres && formData.units ? parseInt(formData.units) / parseFloat(formData.acres) : undefined,
          ff_per_acre: formData.frontage && formData.acres ? parseFloat(formData.frontage) / parseFloat(formData.acres) : undefined
        }

        onSubmit(parcelData)
      } else {
        // Fallback to local state only (for development/testing)
        console.warn('⚠️ Missing required IDs, saving to local state only')

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
          // New taxonomy fields
          family_name: formData.family_name || undefined,
          density_code: formData.density_code || undefined,
          type_code: formData.type_code || undefined,
          product_code: formData.product_code || undefined,
          // Calculate additional fields
          efficiency: 0.85,
          density_gross: formData.acres && formData.units ? parseInt(formData.units) / parseFloat(formData.acres) : undefined,
          ff_per_acre: formData.frontage && formData.acres ? parseFloat(formData.frontage) / parseFloat(formData.acres) : undefined
        }

        onSubmit(parcelData)
      }
    } catch (error) {
      console.error('❌ Failed to save parcel:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save parcel. Please try again.'
      })
    } finally {
      setIsSaving(false)
    }
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
            {/* New Four-Field Taxonomy Selector */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-3">Land Use Classification</h3>
              <TaxonomySelector
                value={taxonomySelection}
                onChange={(taxonomy) => {
                  // Only update if the values actually changed to prevent loops
                  const hasChanged = (
                    taxonomy.family_name !== taxonomySelection.family_name ||
                    taxonomy.density_code !== taxonomySelection.density_code ||
                    taxonomy.type_code !== taxonomySelection.type_code ||
                    taxonomy.product_code !== taxonomySelection.product_code
                  );

                  if (hasChanged) {
                    setTaxonomySelection(taxonomy);
                    setFormData(prev => ({
                      ...prev,
                      family_name: taxonomy.family_name || '',
                      density_code: taxonomy.density_code || '',
                      type_code: taxonomy.type_code || '',
                      product_code: taxonomy.product_code || ''
                    }));
                  }
                }}
              />
              {errors.taxonomy && (
                <p className="text-red-400 text-xs mt-1">{errors.taxonomy}</p>
              )}
              {errors.density && (
                <p className="text-red-400 text-xs mt-1">{errors.density}</p>
              )}
            </div>

            {/* Legacy Land Use Type - Keep for backward compatibility */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Legacy Land Use Type <span className="text-xs text-gray-500">(for backward compatibility)</span>
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

            {/* Residential specific fields */}
            {formData.family_name === "Residential" && (
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
            )}

            {/* Commercial/Industrial specific fields */}
            {(formData.family_name === "Commercial" || formData.family_name === "Industrial") && (
              <>
                {/* Building SF and Site Coverage */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Building SF
                    </label>
                    <input
                      type="number"
                      value={formData.building_sf}
                      onChange={(e) => setFormData({ ...formData, building_sf: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="<Add>"
                    />
                    {formData.building_sf && formData.acres && (
                      <p className="text-gray-400 text-xs mt-1">
                        FAR: {(parseFloat(formData.building_sf) / (parseFloat(formData.acres) * 43560)).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Site Coverage %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.site_coverage_pct}
                      onChange={(e) => setFormData({ ...formData, site_coverage_pct: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="<Add>"
                    />
                  </div>
                </div>

                {/* Setbacks */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Setbacks (ft)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Front</label>
                      <input
                        type="number"
                        value={formData.setback_front_ft}
                        onChange={(e) => setFormData({ ...formData, setback_front_ft: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Side</label>
                      <input
                        type="number"
                        value={formData.setback_side_ft}
                        onChange={(e) => setFormData({ ...formData, setback_side_ft: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Rear</label>
                      <input
                        type="number"
                        value={formData.setback_rear_ft}
                        onChange={(e) => setFormData({ ...formData, setback_rear_ft: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

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

                {/* New Taxonomy Summary */}
                {(formData.family_name || formData.density_code || formData.type_code || formData.product_code) && (
                  <>
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="font-medium text-gray-300 mb-1">Land Use Taxonomy:</div>
                      {formData.family_name && <div>Family: {formData.family_name}</div>}
                      {formData.density_code && <div>Density: {formData.density_code}</div>}
                      {formData.type_code && <div>Type: {formData.type_code}</div>}
                      {formData.product_code && <div>Product: {formData.product_code}</div>}
                    </div>
                  </>
                )}

                {/* Legacy Land Use */}
                <div>Legacy Land Use: {landUseOptions.find(opt => opt.value === formData.landUse)?.label}</div>

                <div>Acres: {formData.acres || '0'}</div>
                <div>Units: {formData.units || '0'}</div>
                {formData.frontage && <div>Frontage: {formData.frontage} ft</div>}
                {formData.product && <div>Product: {formData.product}</div>}
                {formData.building_sf && <div>Building SF: {parseInt(formData.building_sf).toLocaleString()}</div>}
                {formData.site_coverage_pct && <div>Site Coverage: {formData.site_coverage_pct}%</div>}
                {(formData.setback_front_ft || formData.setback_side_ft || formData.setback_rear_ft) && (
                  <div>Setbacks: F:{formData.setback_front_ft || 0}' S:{formData.setback_side_ft || 0}' R:{formData.setback_rear_ft || 0}'</div>
                )}
                {formData.building_sf && formData.acres && (
                  <div>FAR: {(parseInt(formData.building_sf) / (parseFloat(formData.acres) * 43560)).toFixed(2)}</div>
                )}
                <div>Status: {formData.status}</div>
                {formData.acres && formData.units && !['C', 'OS'].includes(formData.landUse) && (
                  <div>Density: {calculateDensity()} units/acre</div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Error Display */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-md p-3 mt-4">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSaving ? 'Saving...' : 'Add Parcel'}
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