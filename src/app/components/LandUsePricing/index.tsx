'use client'

import React, { useEffect, useState } from 'react'
import { formatNumber, parseNumber } from '../../lib/number'
import { useRouter } from 'next/navigation'
import type { UOMOption } from '../../lib/uom-utils'

type LandUseItem = {
  lu_type_code: string
  type_name?: string
  price_per_unit: number
  unit_of_measure: string
  inflation_type: string
}

type Props = {
  landUsePricing?: LandUseItem[]
  setLandUsePricing?: React.Dispatch<React.SetStateAction<LandUseItem[]>>
  uomOptions: UOMOption[]
  inflationOptions: string[]
  onOpenGrowthDetail: (rateId: string) => void
  projectId?: number | null
}

const LandUsePricing: React.FC<Props> = ({
  landUsePricing: propLandUsePricing,
  setLandUsePricing: propSetLandUsePricing,
  uomOptions,
  inflationOptions,
  onOpenGrowthDetail,
  projectId = 1,
}) => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeLandUseTypes, setActiveLandUseTypes] = useState<any[]>([])
  const [pricingData, setPricingData] = useState<LandUseItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Initialize data by loading both active types and existing pricing
  useEffect(() => {
    const initializeData = async () => {
      if (!projectId) return

      setLoading(true)
      try {
        // Load active land use types
        const typesResponse = await fetch(`/api/landuse/active-types?project_id=${projectId}`)
        if (!typesResponse.ok) throw new Error('Failed to load land use types')
        const types = await typesResponse.json()
        setActiveLandUseTypes(types)

        // Load existing pricing data
        const pricingResponse = await fetch(`/api/market-pricing?project_id=${projectId}`)
        if (!pricingResponse.ok) throw new Error('Failed to load pricing data')
        const existingPricing = await pricingResponse.json()

        // Create pricing data map for quick lookup
        const existingPricingMap = existingPricing.reduce((acc: any, item: any) => {
          acc[item.lu_type_code] = item
          return acc
        }, {})

        // Merge active types with existing pricing data
        const mergedPricingData = types.map((type: any) => {
          const existing = existingPricingMap[type.code]
          return existing ? {
            ...existing,
            type_name: type.name // Ensure we have the type name
          } : {
            lu_type_code: type.code,
            type_name: type.name,
            price_per_unit: 0,
            unit_of_measure: 'LS',
            inflation_type: 'Global'
          }
        })

        setPricingData(mergedPricingData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load pricing data')
        setLoading(false)
      }
    }

    initializeData()
  }, [projectId])

  // Update pricing data
  const updatePricingData = (typeCode: string, field: string, value: any) => {
    setPricingData(prev => prev.map(item =>
      item.lu_type_code === typeCode
        ? { ...item, [field]: value }
        : item
    ))
  }

  // Save pricing data
  const savePricingData = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/market-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          pricing_data: pricingData
        })
      })

      if (!response.ok) throw new Error('Failed to save pricing data')

      // Show success feedback briefly
      setTimeout(() => setSaving(false), 1000)
    } catch (err) {
      console.error('Failed to save pricing data:', err)
      setError('Failed to save pricing data')
      setSaving(false)
    }
  }

  // Handle navigate to planning
  const navigateToPlanning = () => {
    // Dispatch custom event to trigger navigation in parent component
    window.dispatchEvent(new CustomEvent('navigateToView', {
      detail: { view: 'planning' }
    }))
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
          <h2 className="text-sm font-semibold text-white">Current Land Pricing</h2>
        </div>
        <div className="p-4 text-center text-slate-400">
          Loading pricing data...
        </div>
      </div>
    )
  }

  // Empty state when no parcels have land use types assigned
  if (activeLandUseTypes.length === 0) {
    return (
      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
          <h2 className="text-sm font-semibold text-white">Current Land Pricing</h2>
        </div>
        <div className="p-4">
          <div className="bg-yellow-900 border border-yellow-600 rounded px-3 py-2 mb-3">
            <div className="text-yellow-200 text-sm">
              Pricing Requires at least 1 Project Parcel
            </div>
          </div>
          <button
            onClick={navigateToPlanning}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            Planning
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Current Land Pricing</h2>
          <button
            onClick={savePricingData}
            disabled={saving}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:bg-gray-600"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div className="flex items-center text-xs space-x-2 text-slate-300">
          <div className="w-1/6">LU Code</div>
          <div className="w-2/6">Description</div>
          <div className="w-1/6 text-center">$/Unit</div>
          <div className="w-1/6 text-center">UOM</div>
          <div className="w-1/6 text-center">Inflate</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border-b border-red-600 px-3 py-2">
          <div className="text-red-200 text-xs">{error}</div>
        </div>
      )}

      <div className="p-2 space-y-1">
        {pricingData.map(item => (
          <div key={item.lu_type_code} className="flex items-center text-xs space-x-2">
            <div className="w-1/6">
              <div className="w-full bg-blue-900 border border-slate-600 rounded px-2 py-1 text-white text-xs font-medium">
                {item.lu_type_code}
              </div>
            </div>
            <div className="w-2/6">
              <div className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                {item.type_name || activeLandUseTypes.find(t => t.code === item.lu_type_code)?.name || ''}
              </div>
            </div>
            <div className="w-1/6">
              <input
                type="text"
                inputMode="decimal"
                className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
                value={formatNumber(item.price_per_unit)}
                onChange={(e) => updatePricingData(item.lu_type_code, 'price_per_unit', parseNumber(e.target.value))}
              />
            </div>
            <div className="w-1/6">
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                value={item.unit_of_measure}
                onChange={(e) => updatePricingData(item.lu_type_code, 'unit_of_measure', e.target.value)}
              >
                {uomOptions.map(option => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="w-1/6">
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                value={item.inflation_type}
                onChange={(e) => {
                  if (e.target.value === 'D') {
                    onOpenGrowthDetail(`lu_${item.lu_type_code}`)
                  } else {
                    updatePricingData(item.lu_type_code, 'inflation_type', e.target.value)
                  }
                }}
              >
                {inflationOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value="D">D</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LandUsePricing
