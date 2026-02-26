'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { formatNumber, parseNumber } from '../../lib/number'

type Props = {
  onClose: () => void
  rateId?: number | string | null
}

const GrowthRateDetail: React.FC<Props> = ({ onClose }) => {
  const [steps, setSteps] = useState([
    { id: 1, fromPeriod: 1, rate: 2.0, periods: 16, thruPeriod: 16 },
    { id: 2, fromPeriod: 17, rate: 3.0, periods: 24, thruPeriod: 40 },
    { id: 3, fromPeriod: 41, rate: 2.5, periods: 20, thruPeriod: 44 },
    { id: 4, fromPeriod: 45, rate: 2.0, periods: 'E' as number | string, thruPeriod: 180 },
    { id: 5, fromPeriod: '' as number | string, rate: '' as number | string, periods: '' as number | string, thruPeriod: 180 }
  ])

  const updateStep = (id: number, field: 'fromPeriod' | 'rate' | 'periods', value: any) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, [field]: value } : step))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-2xl mx-4">
        <div className="px-4 py-3 border-b border-slate-600 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Custom Growth Rate</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-slate-700 rounded p-3">
            <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600 mb-2">
              <div className="w-1/6">Step</div>
              <div className="w-1/6">From Period</div>
              <div className="w-1/6">Rate</div>
              <div className="w-1/6">Periods</div>
              <div className="w-1/6">Thru Period</div>
            </div>
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-2 mb-1">
                <div className="w-1/6 text-white text-sm font-medium">{index + 1}</div>
                <div className="w-1/6">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                    value={typeof step.fromPeriod === 'number' ? formatNumber(step.fromPeriod) : step.fromPeriod}
                    onChange={(e) => updateStep(step.id, 'fromPeriod', e.target.value.replace(/,/g, ''))}
                  />
                </div>
                <div className="w-1/6">
                  <div className="flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full bg-gray-700 border border-slate-500 rounded px-2 py-1 text-white text-sm font-medium text-center"
                      value={formatNumber(step.rate)}
                      onChange={(e) => updateStep(step.id, 'rate', parseNumber(e.target.value))}
                    />
                    <span className="ml-1 text-blue-400 text-sm font-medium">%</span>
                  </div>
                </div>
                <div className="w-1/6">
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-slate-500 rounded px-2 py-1 text-white text-sm font-medium text-center"
                    value={typeof step.periods === 'number' ? formatNumber(step.periods) : step.periods}
                    onChange={(e) => updateStep(step.id, 'periods', e.target.value.replace(/,/g, ''))}
                  />
                </div>
                <div className="w-1/6 text-slate-300 text-sm">{step.thruPeriod}</div>
              </div>
            ))}
            <div className="mt-3 text-xs text-slate-400">E = End of Analysis</div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-500 rounded text-slate-300 hover:bg-slate-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Save / Update
          </button>
        </div>
      </div>
    </div>
  )
}

export default GrowthRateDetail
