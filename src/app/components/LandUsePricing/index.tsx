'use client'

import React from 'react'
import { formatNumber, parseNumber } from '../../lib/number'

type LandUseItem = {
  id: number
  code: string
  description: string
  price: number
  uom: string
  inflationRate: string
}

type Props = {
  landUsePricing: LandUseItem[]
  setLandUsePricing: React.Dispatch<React.SetStateAction<LandUseItem[]>>
  uomOptions: { code: string; label: string }[]
  inflationOptions: string[]
  onOpenGrowthDetail: (rateId: string) => void
}

const LandUsePricing: React.FC<Props> = ({
  landUsePricing,
  setLandUsePricing,
  uomOptions,
  inflationOptions,
  onOpenGrowthDetail,
}) => {
  return (
    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
        <h2 className="text-sm font-semibold text-white">Current Land Pricing</h2>
        <div className="flex text-xs text-slate-300 mt-1">
          <div className="w-1/6">LU Code</div>
          <div className="w-2/6">Description</div>
          <div className="w-1/6 text-center">$/Unit</div>
          <div className="w-1/6 text-center">UOM</div>
          <div className="w-1/6 text-center">Inflate</div>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {landUsePricing.map(item => (
          <div key={item.id} className="flex items-center text-xs space-x-2">
            <div className="w-1/6">
              <input
                type="text"
                className="w-full bg-blue-900 border border-slate-600 rounded px-2 py-1 text-white text-xs font-medium"
                value={item.code}
                onChange={(e) => setLandUsePricing(prev =>
                  prev.map(lu => lu.id === item.id ? { ...lu, code: e.target.value } : lu)
                )}
              />
            </div>
            <div className="w-2/6">
              <input
                type="text"
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                value={item.description}
                onChange={(e) => setLandUsePricing(prev =>
                  prev.map(lu => lu.id === item.id ? { ...lu, description: e.target.value } : lu)
                )}
              />
            </div>
            <div className="w-1/6">
              <input
                type="text"
                inputMode="decimal"
                className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
                value={formatNumber(item.price)}
                onChange={(e) => setLandUsePricing(prev =>
                  prev.map(lu => lu.id === item.id ? { ...lu, price: parseNumber(e.target.value) } : lu)
                )}
              />
            </div>
            <div className="w-1/6">
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                value={item.uom}
                onChange={(e) => setLandUsePricing(prev =>
                  prev.map(lu => lu.id === item.id ? { ...lu, uom: e.target.value } : lu)
                )}
              >
                {uomOptions.map(option => (
                  <option key={option.code} value={option.label}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="w-1/6">
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                value={item.inflationRate}
                onChange={(e) => {
                  if (e.target.value === 'D') {
                    onOpenGrowthDetail(`lu_${item.id}`)
                  } else {
                    setLandUsePricing(prev =>
                      prev.map(lu => lu.id === item.id ? { ...lu, inflationRate: e.target.value } : lu)
                    )
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
