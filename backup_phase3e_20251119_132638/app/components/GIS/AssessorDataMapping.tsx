'use client'

import React, { useState } from 'react'

interface AssessorDataMappingProps {
  projectId: number
  boundaryData: BoundaryData
  onMappingConfirmed: (mappingData: MappingData) => void
  onCancel?: () => void
}

interface BoundaryData {
  selectedParcels: TaxParcel[]
  totalAcres: number
  projectData: {
    estimatedAcres?: number
    primaryAddress?: string
    primaryOwner?: string
    county?: string
    landUseType?: string
    totalValue?: number
  }
}

interface TaxParcel {
  PARCELID: string
  OWNERNME1?: string
  SITEADDRESS?: string
  GROSSAC?: number
  CNVYNAME?: string
  USEDSCRP?: string
  APPRAISEDVALUE?: number
  MARKETVALUE?: number
}

interface ProjectFieldMapping {
  field: string
  label: string
  currentValue?: string | number
  proposedValue?: string | number
  source: 'manual' | 'assessor' | 'calculated'
  enabled: boolean
  required: boolean
}

interface MappingData {
  projectUpdates: Record<string, any>
  fieldMappings: ProjectFieldMapping[]
  boundaryMetadata: {
    selectedParcels: TaxParcel[]
    totalAcres: number
    mappingConfirmedAt: string
  }
}

export default function AssessorDataMapping({
  projectId,
  boundaryData,
  onMappingConfirmed,
  onCancel
}: AssessorDataMappingProps) {
  const [fieldMappings, setFieldMappings] = useState<ProjectFieldMapping[]>(() => {
    return [
      {
        field: 'project_acres',
        label: 'Project Acres',
        currentValue: '',
        proposedValue: boundaryData.totalAcres,
        source: 'calculated',
        enabled: true,
        required: true
      },
      {
        field: 'county',
        label: 'County',
        currentValue: '',
        proposedValue: boundaryData.projectData.county || '',
        source: 'assessor',
        enabled: true,
        required: true
      },
      {
        field: 'city',
        label: 'City/Jurisdiction',
        currentValue: '',
        proposedValue: boundaryData.projectData.city || '',
        source: 'assessor',
        enabled: true,
        required: false
      }
    ]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string>('')


  const toggleFieldEnabled = (fieldName: string) => {
    setFieldMappings(prev => prev.map(mapping =>
      mapping.field === fieldName ? { ...mapping, enabled: !mapping.enabled } : mapping
    ))
  }

  const handleCustomValue = (fieldName: string, value: string) => {
    setFieldMappings(prev => prev.map(mapping =>
      mapping.field === fieldName
        ? { ...mapping, proposedValue: value, source: 'manual' }
        : mapping
    ))
  }

  const validateMappings = (): boolean => {
    const requiredFields = fieldMappings.filter(m => m.required && m.enabled)
    const missingRequired = requiredFields.filter(m => !m.proposedValue)

    if (missingRequired.length > 0) {
      setValidationError(`Required fields missing: ${missingRequired.map(m => m.label).join(', ')}`)
      return false
    }

    setValidationError('')
    return true
  }

  const handleConfirmMapping = async () => {
    if (!validateMappings()) return

    setIsSubmitting(true)
    try {
      const enabledMappings = fieldMappings.filter(m => m.enabled)
      const projectUpdates = enabledMappings.reduce((updates, mapping) => {
        if (mapping.proposedValue) {
          updates[mapping.field] = mapping.proposedValue
        }
        return updates
      }, {} as Record<string, any>)

      const mappingData: MappingData = {
        projectUpdates,
        fieldMappings: enabledMappings,
        boundaryMetadata: {
          selectedParcels: boundaryData.selectedParcels,
          totalAcres: boundaryData.totalAcres,
          mappingConfirmedAt: new Date().toISOString()
        }
      }

      // Store the mapping in database
      const response = await fetch('/api/gis/project-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mappingData
        })
      })

      if (response.ok) {
        onMappingConfirmed(mappingData)
      } else {
        const error = await response.json()
        setValidationError(`Failed to save mapping: ${error.message}`)
      }
    } catch (error) {
      console.error('Error confirming mapping:', error)
      setValidationError('Failed to confirm field mapping. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const enabledFieldsCount = fieldMappings.filter(m => m.enabled).length
  const requiredFieldsCount = fieldMappings.filter(m => m.required && m.enabled).length

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Confirm Project Data</h2>
            <p className="text-gray-400 text-sm mt-1">
              Review and confirm which assessor data to use for your project
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Boundary Summary */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Selected Boundary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Parcels Selected</div>
                  <div className="text-white font-medium">{boundaryData.selectedParcels.length}</div>
                </div>
                <div>
                  <div className="text-gray-400">Total Acres</div>
                  <div className="text-white font-medium">{boundaryData.totalAcres.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Primary Owner</div>
                  <div className="text-white font-medium truncate">
                    {boundaryData.projectData.primaryOwner || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">County</div>
                  <div className="text-white font-medium">{boundaryData.projectData.county}</div>
                </div>
              </div>
            </div>

            {/* Field Mappings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Project Field Mapping</h3>
              <p className="text-gray-400 text-sm mb-6">
                Choose which assessor data to apply to your project. You can modify values or disable fields as needed.
              </p>

              <div className="space-y-4">
                {fieldMappings.map((mapping) => (
                  <div key={mapping.field} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={mapping.enabled}
                          onChange={() => toggleFieldEnabled(mapping.field)}
                          className="text-blue-600"
                        />
                        <div>
                          <div className="text-white font-medium">
                            {mapping.label}
                            {mapping.required && (
                              <span className="text-red-400 ml-1">*</span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Source: {mapping.source === 'assessor' ? 'Tax Assessor' :
                                   mapping.source === 'calculated' ? 'Calculated' : 'Manual'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {mapping.enabled && (
                      <div className="ml-6">
                        {mapping.source === 'manual' || !mapping.proposedValue ? (
                          <input
                            type="text"
                            value={mapping.proposedValue as string || ''}
                            onChange={(e) => handleCustomValue(mapping.field, e.target.value)}
                            placeholder="Enter custom value..."
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm flex-1">
                              {mapping.proposedValue}
                            </div>
                            <button
                              onClick={() => handleCustomValue(mapping.field, mapping.proposedValue as string || '')}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Mapping Summary</h3>

          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-400">Enabled Fields:</span>
              <span className="text-white">{enabledFieldsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Required Fields:</span>
              <span className="text-white">{requiredFieldsCount}</span>
            </div>
          </div>

          {validationError && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
              {validationError}
            </div>
          )}

          <button
            onClick={handleConfirmMapping}
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Saving Mapping...' : 'Confirm & Continue'}
          </button>

          <div className="mt-3 text-xs text-gray-400 text-center">
            This will update your project with the selected data
          </div>
        </div>
      </div>
    </div>
  )
}