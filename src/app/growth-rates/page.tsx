'use client'

import React from 'react'
import GrowthRatesManager from '../components/GrowthRatesManager'

export default function GrowthRatesPage() {
  const handleGrowthRateChange = (setId: number, steps: any[]) => {
    console.log('Growth rate updated:', setId, steps)
    // This would typically update your budget calculations
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Growth Rates Management</h1>
        <p className="text-gray-600">
          Configure ARGUS-style step-based growth assumptions for different cost and revenue categories.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Development Costs */}
        <GrowthRatesManager
          projectId={1}
          cardType="cost"
          onGrowthRateChange={handleGrowthRateChange}
        />

        {/* Revenue Growth */}
        <GrowthRatesManager
          projectId={1}
          cardType="revenue"
          onGrowthRateChange={handleGrowthRateChange}
        />

        {/* Absorption Rates */}
        <GrowthRatesManager
          projectId={1}
          cardType="absorption"
          onGrowthRateChange={handleGrowthRateChange}
        />
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Integration Notes</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Growth rates are stored in the database and linked to your budget facts via <code>growth_rate_set_id</code></li>
          <li>• The existing <code>escalation_rate</code> field in <code>core_fin_fact_budget</code> can be used for backwards compatibility</li>
          <li>• Each project can have multiple rate sets for different scenarios (Custom 1, Custom 2, etc.)</li>
          <li>• Step-based rates follow ARGUS conventions with "E" representing end-of-analysis periods</li>
          <li>• Use the <code>onGrowthRateChange</code> callback to trigger budget recalculations when rates change</li>
        </ul>
      </div>
    </div>
  )
}