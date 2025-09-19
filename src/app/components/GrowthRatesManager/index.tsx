'use client'

import React, { useState, useEffect } from 'react'

interface GrowthRateStep {
  step_id?: number
  step_number: number
  from_period: number | null
  periods: number | null
  rate: number | null
  thru_period?: number | null
}

interface GrowthRateSet {
  set_id: number
  project_id: number
  card_type: string
  set_name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

interface GrowthRatesManagerProps {
  projectId: number
  cardType: 'cost' | 'revenue' | 'absorption'
  onGrowthRateChange?: (setId: number, steps: GrowthRateStep[]) => void
}

const GrowthRatesManager: React.FC<GrowthRatesManagerProps> = ({
  projectId,
  cardType,
  onGrowthRateChange
}) => {
  const [growthSets, setGrowthSets] = useState<GrowthRateSet[]>([])
  const [activeSetId, setActiveSetId] = useState<number | null>(null)
  const [activeSteps, setActiveSteps] = useState<GrowthRateStep[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Default step structure matching ARGUS pattern
  const defaultSteps: GrowthRateStep[] = [
    { step_number: 1, from_period: 1, periods: 16, rate: 2.0 },
    { step_number: 2, from_period: 17, periods: 24, rate: 3.0 },
    { step_number: 3, from_period: 41, periods: 20, rate: 2.5 },
    { step_number: 4, from_period: 61, periods: null, rate: 2.0 },
    { step_number: 5, from_period: null, periods: null, rate: null }
  ]

  useEffect(() => {
    loadGrowthSets()
  }, [projectId, cardType])

  const loadGrowthSets = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/growth-rates/${cardType}`)
      if (!response.ok) {
        throw new Error(`Failed to load growth sets: ${response.statusText}`)
      }

      const sets = await response.json()
      setGrowthSets(sets)

      const defaultSet = sets.find((s: GrowthRateSet) => s.is_default) || sets[0]
      if (defaultSet) {
        setActiveSetId(defaultSet.set_id)
        await loadStepsForSet(defaultSet.set_id)
      }
    } catch (error) {
      console.error('Failed to load growth sets:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStepsForSet = async (setId: number) => {
    try {
      const response = await fetch(`/api/growth-rate-sets/${setId}/steps`)
      if (!response.ok) {
        throw new Error(`Failed to load growth steps: ${response.statusText}`)
      }

      const steps = await response.json()
      setActiveSteps(steps.length > 0 ? steps : defaultSteps)
    } catch (error) {
      console.error('Failed to load growth steps:', error)
      setActiveSteps(defaultSteps)
    }
  }

  const handleStepChange = (stepIndex: number, field: keyof GrowthRateStep, value: number | null) => {
    const updatedSteps = [...activeSteps]
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      [field]: value
    }

    // Auto-calculate from_period for subsequent steps
    if (field === 'periods' && stepIndex < updatedSteps.length - 1) {
      const currentStep = updatedSteps[stepIndex]
      if (currentStep.from_period && currentStep.periods) {
        const nextFromPeriod = currentStep.from_period + currentStep.periods
        updatedSteps[stepIndex + 1] = {
          ...updatedSteps[stepIndex + 1],
          from_period: nextFromPeriod
        }
      }
    }

    setActiveSteps(updatedSteps)
  }

  const saveSteps = async () => {
    if (!activeSetId) return

    try {
      const validSteps = activeSteps.filter(step =>
        step.from_period !== null && step.rate !== null
      )

      const response = await fetch(`/api/growth-rate-sets/${activeSetId}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: validSteps })
      })

      if (!response.ok) {
        throw new Error(`Failed to save growth steps: ${response.statusText}`)
      }

      const result = await response.json()
      setActiveSteps(result.steps || validSteps)
      setIsEditing(false)
      onGrowthRateChange?.(activeSetId, result.steps || validSteps)
    } catch (error) {
      console.error('Failed to save growth steps:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const getCardTitle = () => {
    switch (cardType) {
      case 'cost': return 'Development Costs'
      case 'revenue': return 'Revenue Growth'
      case 'absorption': return 'Absorption Rates'
      default: return 'Growth Rates'
    }
  }

  const getCurrentRate = () => {
    const firstValidStep = activeSteps.find(s => s.rate !== null)
    return firstValidStep ? `${firstValidStep.rate}%` : '0.00%'
  }

  if (isLoading) {
    return (
      <div className="w-full border rounded-lg bg-white p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full border rounded-lg bg-white p-4">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="w-full border rounded-lg bg-white">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs">
              📈
            </div>
            <h3 className="font-medium">{getCardTitle()}</h3>
          </div>
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
            {getCurrentRate()}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Growth Rate Set Tabs */}
        <div className="border-b">
          <div className="flex space-x-1">
            {growthSets.map((set) => (
              <button
                key={set.set_id}
                onClick={() => {
                  setActiveSetId(set.set_id)
                  loadStepsForSet(set.set_id)
                  setIsEditing(false)
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSetId === set.set_id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {set.set_name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Set Configuration */}
        {activeSetId && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Step-based growth assumptions:
              </h4>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveSteps}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Save / Update
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Steps Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Step</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">From Period</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Periods</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thru Period</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeSteps.map((step, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 font-medium">{step.step_number}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            value={step.from_period || ''}
                            onChange={(e) => handleStepChange(index, 'from_period', parseInt(e.target.value) || null)}
                            className="w-16 px-2 py-1 border rounded text-sm"
                          />
                        ) : (
                          step.from_period || '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex items-center">
                            <input
                              type="number"
                              step="0.1"
                              value={step.rate || ''}
                              onChange={(e) => handleStepChange(index, 'rate', parseFloat(e.target.value) || null)}
                              className="w-16 px-2 py-1 border rounded text-sm"
                            />
                            <span className="ml-1 text-blue-600">%</span>
                          </div>
                        ) : (
                          step.rate ? (
                            <span className="text-blue-600">{step.rate}%</span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            value={step.periods || ''}
                            onChange={(e) => handleStepChange(index, 'periods', parseInt(e.target.value) || null)}
                            placeholder="E"
                            className="w-16 px-2 py-1 border rounded text-sm"
                          />
                        ) : (
                          step.periods || 'E'
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {step.periods && step.from_period
                          ? step.from_period + step.periods - 1
                          : step.periods === null ? 'E' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              E = End of Analysis
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GrowthRatesManager