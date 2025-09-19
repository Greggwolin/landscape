"use client";

import React, { useEffect, useState } from "react";
import MarketFactors from './MarketFactors'
import ProjectCosts from './ProjectCosts'
import LandUsePricing from './LandUsePricing'
import GrowthRateDetail from './GrowthRateDetail'

type LookupResp = { [k: string]: { code: string; label: string; sort_order?: number }[] }

type Props = { projectId?: number | null }

const MarketAssumptions: React.FC<Props> = ({ projectId = null }) => {
  const [marketFactors, setMarketFactors] = useState([
    { id: 1, name: 'Housing Demand', value: 500, unit: 'Units / Year', dvl: 'DVL', enabled: true },
    { id: 2, name: 'Contingency', value: 10.0, unit: 'Detail', dvl: 'Allow for up to 5 user-named contingency rates', enabled: true },
    { id: 3, name: 'Commissions', value: 3.0, unit: 'Net', dvl: 'Detail', enabled: true },
    { id: 4, name: 'Other / COS', value: 1.0, unit: '', dvl: 'boolean', enabled: true },
    { id: 5, name: 'Other', value: 1.0, unit: '', dvl: 'boolean', enabled: false },
    { id: 6, name: 'Other', value: 1.0, unit: '', dvl: 'boolean', enabled: false },
    { id: 7, name: 'Other', value: 1.0, unit: '', dvl: 'boolean', enabled: false },
  ])

  const [growthRates, setGrowthRates] = useState([
    { id: 1, name: 'Prices / Revenue', value: 3.0, detail: true },
    { id: 2, name: 'Direct Project Costs', value: 3.0, detail: true }
  ])

  const [projectCosts, setProjectCosts] = useState({
    planningEngineering: [
      { id: 1, name: 'Entitlement Cost', amount: 250, unit: '$/FF', dvl: 'DVL', enabled: true },
      { id: 2, name: 'Engineering Cost', amount: 1750, unit: 'Lot', dvl: 'DVL', enabled: true },
      ...Array.from({length: 8}, (_, i) => ({ id: i + 3, name: '', amount: '', unit: '$/FF', dvl: 'DVL', enabled: false }))
    ],
    development: [
      { id: 1, name: 'Project Costs (Offsite)', amount: 100, unit: '$/FF', dvl: 'DVL', enabled: true },
      { id: 2, name: 'Project Costs (Onsite)', amount: 200, unit: '$/FF', dvl: 'DVL', enabled: true },
      { id: 3, name: 'Subdivision Development Cost', amount: 1300, unit: '$/FF', dvl: 'DVL', enabled: true },
      { id: 4, name: 'Other 1', amount: '', unit: '$/FF', dvl: 'DVL', enabled: false },
      ...Array.from({length: 6}, (_, i) => ({ id: i + 5, name: '', amount: '', unit: '$/FF', dvl: 'DVL', enabled: false }))
    ],
    ownership: [
      { id: 1, name: 'Management Fees', amount: 300000, unit: 'Ann/Qtr/Mo', dvl: 'DVL', enabled: true },
      { id: 2, name: 'General & Administrative', amount: 50000, unit: 'Ann/Qtr/Mo', dvl: 'DVL', enabled: true },
      { id: 3, name: 'Legal & Accounting', amount: 10000, unit: 'Ann/Qtr/Mo', dvl: 'DVL', enabled: true },
      { id: 4, name: 'Other', amount: '', unit: 'Ann/Qtr/Mo', dvl: 'DVL', enabled: false },
      ...Array.from({length: 6}, (_, i) => ({ id: i + 5, name: '', amount: '', unit: 'Ann/Qtr/Mo', dvl: 'DVL', enabled: false }))
    ],
    carryCosts: [
      { id: 1, name: 'Property Tax', amount: 50, unit: '$/Acre', dvl: 'DVL', enabled: true },
      { id: 2, name: 'Insurance', amount: 20, unit: '$/Acre', dvl: 'DVL', enabled: true },
      { id: 3, name: 'Other 1', amount: '', unit: '$/Acre', dvl: 'DVL', enabled: false },
      { id: 4, name: 'Other 2', amount: '', unit: '$/Acre', dvl: 'DVL', enabled: false },
      ...Array.from({length: 6}, (_, i) => ({ id: i + 5, name: '', amount: '', unit: '$/Acre', dvl: 'DVL', enabled: false }))
    ]
  })

  const [landUsePricing, setLandUsePricing] = useState([
    { id: 1, code: 'C', description: 'Commercial', price: 10, uom: '$/SF', inflationRate: 'Global' },
    { id: 2, code: 'HDR', description: 'High Density Residential', price: 25000, uom: '$/Unit', inflationRate: 'Global' },
    { id: 3, code: 'MDR', description: 'Medium Density Residential', price: 2400, uom: '$/FF', inflationRate: 'Global' },
    { id: 4, code: 'MHDR', description: 'Medium-High Density Residential', price: 50000, uom: '$/Unit', inflationRate: 'Custom 1' },
    { id: 5, code: 'MLDR', description: 'Medium-Low Density Residential', price: 2200, uom: '$/FF', inflationRate: 'Custom 2' },
    { id: 6, code: 'MU', description: 'Mixed Use', price: 10, uom: '$/SF', inflationRate: 'Global' },
    { id: 7, code: 'OS', description: 'Open Space', price: 0, uom: '$/Acre', inflationRate: 'Global' }
  ])

  const [showGrowthDetail, setShowGrowthDetail] = useState(false)
  const [selectedGrowthRate, setSelectedGrowthRate] = useState<number | string | null>(null)

  const [lookupLists, setLookupLists] = useState<LookupResp>({})
  const inflationOptions = ['Global', 'Custom 1', 'Custom 2', 'Custom 3']

  const updateProjectCost = (section: string, id: number, field: string, value: any) => {
    setProjectCosts(prev => ({
      ...prev,
      [section]: prev[section].map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    }))
  }

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const res = await fetch('/api/lookups?key=uom,commission_basis,housing_demand_unit,contingency_name', { cache: 'no-store' })
        const data = await res.json()
        setLookupLists(data)
      } catch (e) {
        console.error('Failed to load lookups', e)
      }
    }
    loadLookups()
  }, [])

  useEffect(() => {
    if (projectId) {
      ;(async () => {
        try {
          const res = await fetch(`/api/assumptions?project_id=${projectId}`, { cache: 'no-store' })
          const data = await res.json()
          if (data?.commission_basis || data?.demand_unit) {
            setMarketFactors(prev => prev.map(f => {
              if (f.name === 'Commissions' && data.commission_basis) return { ...f, unit: data.commission_basis }
              if (f.name === 'Housing Demand' && data.demand_unit) return { ...f, unit: data.demand_unit }
              return f
            }))
          }
          if (data?.uom) setLandUsePricing(prev => prev.map((lu, idx) => idx === 0 ? { ...lu, uom: data.uom } : lu))
        } catch (e) {
          console.error('Failed to hydrate assumptions', e)
        }
      })()
    }
  }, [projectId])

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const onSave = async () => {
    if (!projectId) return
    setSaveStatus('saving')
    try {
      const commission = marketFactors.find(m => m.name === 'Commissions')?.unit ?? null
      const demandUnit = marketFactors.find(m => m.name === 'Housing Demand')?.unit ?? null
      const defaultUom = landUsePricing?.[0]?.uom ?? null
      const res = await fetch('/api/assumptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, commission_basis: commission, demand_unit: demandUnit, uom: defaultUom })
      })
      if (!res.ok) throw new Error(await res.text())
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch (e) {
      console.error('Save failed', e)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  return (
    <div className="p-4 space-y-4 bg-slate-900 min-h-screen text-white">
      {/* Unified Market Factors Card */}
      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
        <div className="bg-gray-900 px-3 py-2 border-b border-slate-600 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Market Factors</h2>
          <button onClick={onSave} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
        {/* Core Market Factors + Growth Rates */}
        <MarketFactors 
          hideHeader
          marketFactors={marketFactors}
          setMarketFactors={setMarketFactors}
          growthRates={growthRates}
          setGrowthRates={setGrowthRates}
          onOpenGrowthDetail={(id) => { setSelectedGrowthRate(id); setShowGrowthDetail(true); }}
          lists={{
            housing_demand_unit: (lookupLists['housing_demand_unit'] ?? []).map(o => ({ code: o.code, label: o.label })),
            commission_basis: (lookupLists['commission_basis'] ?? []).map(o => ({ code: o.code, label: o.label })),
            contingency_name: (lookupLists['contingency_name'] ?? []).map(o => ({ code: o.code, label: o.label })),
          }}
        />

        {/* Embedded Project Costs sections */}
        <div className="px-0 py-2">
          <ProjectCosts embedded projectCosts={projectCosts} updateProjectCost={updateProjectCost}
            uomOptions={(lookupLists['uom'] ?? []).map(o => ({ code: o.code, label: o.label }))}
          />
        </div>
      </div>

      {/* Land Use Pricing */}
      <LandUsePricing 
        landUsePricing={landUsePricing}
        setLandUsePricing={setLandUsePricing}
        uomOptions={(lookupLists['uom'] ?? []).map(o => ({ code: o.code, label: o.label }))}
        inflationOptions={inflationOptions}
        onOpenGrowthDetail={(rid) => { setSelectedGrowthRate(rid); setShowGrowthDetail(true); }}
      />

      {/* Growth Rate Detail Modal */}
      {showGrowthDetail && (
        <GrowthRateDetail onClose={() => setShowGrowthDetail(false)} rateId={selectedGrowthRate} />
      )}
    </div>
  )
}

export default MarketAssumptions
