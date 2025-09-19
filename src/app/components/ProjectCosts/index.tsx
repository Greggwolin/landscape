'use client'

import React from 'react'
import { formatNumber, parseNumber } from '../../lib/number'

type CostItem = {
  id: number
  name: string
  amount: number | ''
  unit: string
  dvl: string
  enabled: boolean
}

type ProjectCostsState = {
  planningEngineering: CostItem[]
  development: CostItem[]
  ownership: CostItem[]
  carryCosts: CostItem[]
}

type Props = {
  projectCosts: ProjectCostsState
  updateProjectCost: (section: keyof ProjectCostsState, id: number, field: keyof CostItem, value: any) => void
  embedded?: boolean
  uomOptions?: { code: string; label: string }[]
}

const ProjectCosts: React.FC<Props> = ({ projectCosts, updateProjectCost, embedded = false, uomOptions = [] }) => {
  const renderCostSection = (title: string, section: CostItem[], sectionKey: keyof ProjectCostsState) => (
    <div className="overflow-hidden">
      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex text-xs text-gray-300 mt-1">
          <div className="w-1/2">Item</div>
          <div className="w-1/4 text-center">Amount</div>
          <div className="w-1/4 text-center">Unit</div>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {section.filter(item => item.enabled || item.name).map(item => (
          <div key={item.id} className="flex items-center text-xs space-x-2">
            <div className="w-1/2">
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                placeholder="Item name"
                value={item.name}
                onChange={(e) => updateProjectCost(sectionKey, item.id, 'name', e.target.value)}
              />
            </div>
            <div className="w-1/4">
              <input
                type="text"
                inputMode="decimal"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-center"
                value={formatNumber(item.amount)}
                onChange={(e) => updateProjectCost(sectionKey, item.id, 'amount', parseNumber(e.target.value))}
              />
            </div>
            <div className="w-1/4">
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white text-xs"
                value={item.unit}
                onChange={(e) => updateProjectCost(sectionKey, item.id, 'unit', e.target.value)}
              >
                {uomOptions.map(opt => (
                  <option key={opt.code} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={embedded ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
      {renderCostSection('Project Costs - Planning and Engineering', projectCosts.planningEngineering, 'planningEngineering')}
      {renderCostSection('Project Development Costs', projectCosts.development, 'development')}
      {renderCostSection('Ownership Cost', projectCosts.ownership, 'ownership')}
      {renderCostSection('Project Carry Cost Annual', projectCosts.carryCosts, 'carryCosts')}
    </div>
  )
}

export default ProjectCosts
