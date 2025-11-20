'use client'

import React, { useState, useEffect } from 'react'
import { formatNumber, parseNumber } from '../lib/number'

type DVLTimeSeriesData = {
  dvlPerYear: number | null
  dvlPerQuarter: number | null
  dvlPerMonth: number | null
}

type Props = {
  projectId?: number | null
  onDataChange?: (data: DVLTimeSeriesData) => void
  initialData?: DVLTimeSeriesData
}

const DVLTimeSeries: React.FC<Props> = ({
  projectId,
  onDataChange,
  initialData = { dvlPerYear: null, dvlPerQuarter: null, dvlPerMonth: null }
}) => {
  const [data, setData] = useState<DVLTimeSeriesData>(initialData)

  useEffect(() => {
    if (projectId) {
      const loadData = async () => {
        try {
          const res = await fetch(`/api/assumptions?project_id=${projectId}`, { cache: 'no-store' })
          const result = await res.json()
          if (result) {
            const dvlData = {
              dvlPerYear: result.dvl_per_year,
              dvlPerQuarter: result.dvl_per_quarter,
              dvlPerMonth: result.dvl_per_month
            }
            setData(dvlData)
            onDataChange?.(dvlData)
          }
        } catch (e) {
          console.error('Failed to load DVL time series data', e)
        }
      }
      loadData()
    }
  }, [projectId, onDataChange])

  const handleFieldChange = (field: keyof DVLTimeSeriesData, value: string) => {
    const numValue = value === '' ? null : parseNumber(value)
    const newData = { ...data, [field]: numValue }
    setData(newData)
    onDataChange?.(newData)
  }

  return (
    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
        <h3 className="text-sm font-semibold text-white">DVL Time Series</h3>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">$/Year</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full bg-gray-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              placeholder="0.00"
              value={data.dvlPerYear !== null ? formatNumber(data.dvlPerYear) : ''}
              onChange={(e) => handleFieldChange('dvlPerYear', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">$/Quarter</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full bg-gray-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              placeholder="0.00"
              value={data.dvlPerQuarter !== null ? formatNumber(data.dvlPerQuarter) : ''}
              onChange={(e) => handleFieldChange('dvlPerQuarter', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">$/Month</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full bg-gray-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              placeholder="0.00"
              value={data.dvlPerMonth !== null ? formatNumber(data.dvlPerMonth) : ''}
              onChange={(e) => handleFieldChange('dvlPerMonth', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DVLTimeSeries