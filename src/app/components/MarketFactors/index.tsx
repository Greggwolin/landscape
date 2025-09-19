'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { formatNumber, parseNumber } from '../../lib/number'

type MarketFactor = {
  id: number
  name: string
  value: number
  unit: string
  dvl: string
  enabled: boolean
}

type GrowthRate = {
  id: number
  name: string
  value: number
  detail: boolean
}

type Props = {
  marketFactors: MarketFactor[]
  setMarketFactors: React.Dispatch<React.SetStateAction<MarketFactor[]>>
  growthRates: GrowthRate[]
  setGrowthRates: React.Dispatch<React.SetStateAction<GrowthRate[]>>
  onOpenGrowthDetail: (rateId: number) => void
  hideHeader?: boolean
  lists?: {
    housing_demand_unit?: { code: string; label: string }[]
    commission_basis?: { code: string; label: string }[]
    contingency_name?: { code: string; label: string }[]
  }
}

const MarketFactors: React.FC<Props> = ({
  marketFactors,
  setMarketFactors,
  growthRates,
  setGrowthRates,
  onOpenGrowthDetail,
  hideHeader = false,
  lists,
}) => {
  const [showCommissionDetail, setShowCommissionDetail] = useState(false)
  const [showContingencyDetail, setShowContingencyDetail] = useState(false)

  return (
    <div>
      {!hideHeader && (
        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
          <h2 className="text-sm font-semibold text-white">Market Factors</h2>
        </div>
      )}
      <div className="p-2 space-y-1">
        {marketFactors.filter(item => item.enabled).map(item => (
          <div key={item.id} className="flex items-center text-xs space-x-2">
            <div className="w-1/3 text-white">{item.name}</div>
            <div className="w-1/6">
              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
                  value={formatNumber(item.value)}
                  onChange={(e) =>
                    setMarketFactors(prev => prev.map(f =>
                      f.id === item.id ? { ...f, value: parseNumber(e.target.value) } : f
                    ))
                  }
                />
                {item.name === 'Commissions' && (
                  <span className="absolute right-2 text-slate-300">%</span>
                )}
              </div>
            </div>
            <div className="w-1/2 flex items-center space-x-2">
              {item.name === 'Housing Demand' && (
                <select
                  className="w-1/2 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                  value={item.unit}
                  onChange={(e) => setMarketFactors(prev => prev.map(f => f.id === item.id ? { ...f, unit: e.target.value } : f))}
                >
                  {(lists?.housing_demand_unit ?? []).map(opt => (
                    <option key={opt.code} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              )}
              {item.name === 'Contingency' && (
                <>
                  <button
                    onClick={() => setShowContingencyDetail(true)}
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    Detail
                  </button>
                </>
              )}
              {item.name === 'Commissions' && (
                <>
                  <select
                    className="w-1/3 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                    value={item.unit}
                    onChange={(e) => setMarketFactors(prev => prev.map(f => f.id === item.id ? { ...f, unit: e.target.value } : f))}
                  >
                    {(lists?.commission_basis ?? []).map(opt => (
                      <option key={opt.code} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCommissionDetail(true)}
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    Detail
                  </button>
                </>
              )}
              {(item.name === 'Other / COS' || item.name === 'Other') && (
                <select
                  className="w-1/2 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                  value={item.unit}
                  onChange={(e) => setMarketFactors(prev => prev.map(f => f.id === item.id ? { ...f, unit: e.target.value } : f))}
                >
                  <option value="">Select…</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-700 px-3 py-1 border-b border-slate-600 border-t">
        <h3 className="text-xs font-medium text-slate-300">Growth Rates</h3>
      </div>
      <div className="p-2 space-y-1">
        {growthRates.map(item => (
          <div key={item.id} className="flex items-center text-xs space-x-2">
            <div className="w-1/3 text-white">{item.name}</div>
            <div className="w-1/6">
              <input
                type="text"
                inputMode="decimal"
                className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
                value={formatNumber(item.value)}
                onChange={(e) => setGrowthRates(prev =>
                  prev.map(g => g.id === item.id ? { ...g, value: parseNumber(e.target.value) } : g)
                )}
              />
            </div>
            <div className="w-1/4">
              <button
                onClick={() => onOpenGrowthDetail(item.id)}
                className="text-blue-400 hover:text-blue-300 underline text-xs"
              >
                Detail
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCommissionDetail && (
        <CommissionDetailModal onClose={() => setShowCommissionDetail(false)} />
      )}
      {showContingencyDetail && (
        <ContingencyDetailModal onClose={() => setShowContingencyDetail(false)} />
      )}
    </div>
  )
}

export default MarketFactors

export const CommissionDetailModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [commissionRates, setCommissionRates] = useState([
    { id: 1, landUse: 'MDR', rate: 3.0, basis: 'Net' },
    { id: 2, landUse: 'HDR', rate: 3.5, basis: 'Net' },
    { id: 3, landUse: 'C', rate: 4.0, basis: 'Gross' },
    { id: 4, landUse: 'MU', rate: 3.5, basis: 'Net' }
  ])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-2xl mx-4">
        <div className="px-4 py-3 border-b border-slate-600 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Commission Rates by Land Use</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600">
              <div className="w-1/3">Land Use</div>
              <div className="w-1/3 text-center">Rate (%)</div>
              <div className="w-1/3 text-center">Basis</div>
            </div>
            {commissionRates.map(rate => (
              <div key={rate.id} className="flex items-center space-x-2">
                <div className="w-1/3">
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    value={rate.landUse}
                    onChange={(e) => setCommissionRates(prev =>
                      prev.map(r => r.id === rate.id ? { ...r, landUse: e.target.value } : r)
                    )}
                  />
                </div>
                <div className="w-1/3">
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-sm text-center"
                    value={rate.rate}
                    onChange={(e) => setCommissionRates(prev =>
                      prev.map(r => r.id === rate.id ? { ...r, rate: parseFloat(e.target.value) || 0 } : r)
                    )}
                  />
                </div>
                <div className="w-1/3">
                  <select
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    value={rate.basis}
                    onChange={(e) => setCommissionRates(prev =>
                      prev.map(r => r.id === rate.id ? { ...r, basis: e.target.value } : r)
                    )}
                  >
                    <option value="Net">Net</option>
                    <option value="Gross">Gross</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  )
}

export const ContingencyDetailModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [rows, setRows] = useState([
    { id: 1, name: 'Custom 1', rate: 0 },
    { id: 2, name: 'Custom 2', rate: 0 },
    { id: 3, name: 'Custom 3', rate: 0 },
    { id: 4, name: 'Custom 4', rate: 0 },
    { id: 5, name: 'Custom 5', rate: 0 },
  ])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-xl mx-4">
        <div className="px-4 py-3 border-b border-slate-600 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Contingency Detail</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600">
            <div className="w-2/3">Name</div>
            <div className="w-1/3 text-center">Rate (%)</div>
          </div>
          {rows.map(row => (
            <div key={row.id} className="flex items-center space-x-2">
              <div className="w-2/3">
                <input
                  type="text"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                  value={row.name}
                  onChange={(e) => setRows(prev => prev.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                />
              </div>
              <div className="w-1/3">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center"
                    value={formatNumber(row.rate)}
                    onChange={(e) => setRows(prev => prev.map(r => r.id === row.id ? { ...r, rate: parseNumber(e.target.value) } : r))}
                  />
                  <span className="absolute right-2 text-slate-300">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save & Close</button>
        </div>
      </div>
    </div>
  )
}
