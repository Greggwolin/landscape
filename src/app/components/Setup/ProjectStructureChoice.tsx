'use client'

import React, { useState, useEffect } from 'react'

interface ProjectStructureChoiceProps {
  projectId: number
  onStructureSelected: (structureType: 'simple' | 'master_plan') => void
  onCancel?: () => void
  initialChoice?: 'simple' | 'master_plan'
  extractedData?: {
    development_info?: {
      units_planned?: number
      land_uses: string[]
      phases: string[]
    }
    total_acres?: number
    parcel_data?: Array<{
      parcel_id: string
      acres: number
      land_use?: string
    }>
  }
}

interface StructureOption {
  type: 'simple' | 'master_plan'
  title: string
  description: string
  hierarchy: string[]
  benefits: string[]
  bestFor: string
  icon: React.ReactNode
}

const ProjectStructureChoice: React.FC<ProjectStructureChoiceProps> = ({
  projectId,
  onStructureSelected,
  onCancel,
  initialChoice,
  extractedData
}) => {
  const [selectedType, setSelectedType] = useState<'simple' | 'master_plan' | null>(initialChoice || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Smart recommendation based on extracted data
  const getRecommendation = (): 'simple' | 'master_plan' | null => {
    if (!extractedData) return null

    const { development_info, total_acres, parcel_data } = extractedData

    // Recommend master plan if:
    // - More than 100 units planned
    // - More than 50 acres
    // - Multiple phases identified
    // - More than 20 individual parcels
    const unitsPlanned = development_info?.units_planned || 0
    const acres = total_acres || 0
    const phases = development_info?.phases?.length || 0
    const parcelCount = parcel_data?.length || 0

    if (unitsPlanned > 100 || acres > 50 || phases > 2 || parcelCount > 20) {
      return 'master_plan'
    }

    // Recommend simple for smaller projects
    if (unitsPlanned <= 50 && acres <= 25 && phases <= 1 && parcelCount <= 10) {
      return 'simple'
    }

    return null
  }

  const recommendation = getRecommendation()

  const structureOptions: StructureOption[] = [
    {
      type: 'simple',
      title: 'Simple Projects',
      description: 'Direct project-to-parcel organization with optional phases',
      hierarchy: ['Project', 'Phase (Optional)', 'Parcel'],
      benefits: [
        'Quick setup and navigation',
        'Ideal for single-phase developments',
        'Streamlined parcel management',
        'Less organizational complexity'
      ],
      bestFor: 'Small to medium developments, single-phase projects, straightforward land division',
      icon: (
        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      type: 'master_plan',
      title: 'Master Planned Communities',
      description: 'Full area-based organization with parsed parcel codes',
      hierarchy: ['Project', 'Area', 'Phase', 'Parcel'],
      benefits: [
        'Complete hierarchical organization',
        'Area-based parcel coding (1.101 format)',
        'Supports complex phasing strategies',
        'Comprehensive project navigation'
      ],
      bestFor: 'Large developments, multi-area communities, complex phasing requirements',
      icon: (
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M7 7h10M7 11h10" />
        </svg>
      )
    }
  ]

  const handleSubmit = async () => {
    if (!selectedType) {
      setError('Please select a project structure type')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/choose-structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          structure_type: selectedType,
          metadata: {
            reason: 'User selected during GIS setup workflow',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save structure choice')
      }

      const result = await response.json()
      console.log('Structure choice saved:', result)

      onStructureSelected(selectedType)
    } catch (err) {
      console.error('Error saving structure choice:', err)
      setError(err instanceof Error ? err.message : 'Failed to save structure choice')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Choose Project Structure</h2>
          <p className="text-gray-400 text-sm mt-1">
            Select the organizational structure that best fits your development project
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* AI Recommendation */}
          {extractedData && recommendation && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-blue-300 font-medium text-sm mb-1">
                    AI Recommendation: {recommendation === 'simple' ? 'Simple Project' : 'Master Planned Community'}
                  </div>
                  <div className="text-blue-200 text-xs">
                    Based on your uploaded documents:
                    {extractedData.development_info?.units_planned && (
                      <span className="ml-1">{extractedData.development_info.units_planned} units planned</span>
                    )}
                    {extractedData.total_acres && (
                      <span className="ml-1">• {extractedData.total_acres} acres</span>
                    )}
                    {extractedData.development_info?.phases && extractedData.development_info.phases.length > 0 && (
                      <span className="ml-1">• {extractedData.development_info.phases.length} phases</span>
                    )}
                    {extractedData.parcel_data && extractedData.parcel_data.length > 0 && (
                      <span className="ml-1">• {extractedData.parcel_data.length} parcels</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {structureOptions.map((option) => (
              <div
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedType === option.type
                    ? 'border-blue-500 bg-blue-900/20'
                    : recommendation === option.type
                    ? 'border-green-500 bg-green-900/10'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
              >
                {/* Recommendation Badge */}
                {recommendation === option.type && (
                  <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    AI Recommended
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {option.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {option.title}
                    </h3>

                    <p className="text-gray-300 text-sm mb-4">
                      {option.description}
                    </p>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-2">Hierarchy:</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {option.hierarchy.map((level, index) => (
                          <React.Fragment key={level}>
                            <span className={index === 0 ? 'text-blue-400 font-medium' : ''}>{level}</span>
                            {index < option.hierarchy.length - 1 && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-2">Benefits:</h4>
                      <ul className="space-y-1">
                        {option.benefits.map((benefit, index) => (
                          <li key={index} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">•</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-200 mb-1">Best For:</h4>
                      <p className="text-xs text-gray-400">{option.bestFor}</p>
                    </div>
                  </div>
                </div>

                {selectedType === option.type && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center gap-2 text-blue-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-700">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!selectedType || isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Continue with Selected Structure'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectStructureChoice