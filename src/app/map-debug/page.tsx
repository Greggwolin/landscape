'use client'

import React from 'react'
import GISMap from '../components/MapLibre/GISMap'

export default function MapDebugPage() {
  const handleParcelSelect = (features: Record<string, unknown>[]) => {
    console.log('Selected parcels:', features)
    alert(`Selected ${features.length} parcels. Check console for details.`)
  }

  return (
    <div className="h-screen bg-gray-900">
      <div className="absolute top-4 left-4 z-10 bg-gray-800 text-white p-4 rounded-lg shadow-lg">
        <h1 className="text-lg font-bold mb-2">🗺️ Pinal County Parcel Test</h1>
        <p className="text-sm text-gray-300 mb-1">• Zoom to level 10+ to load parcels</p>
        <p className="text-sm text-gray-300 mb-1">• Red lines = tax parcels</p>
        <p className="text-sm text-gray-300 mb-1">• Click parcels to select (turn green)</p>
        <p className="text-sm text-yellow-300">• Check browser title for debug info</p>
      </div>

      <GISMap
        projectId={7}
        mode="parcel-select"
        onParcelSelect={handleParcelSelect}
        className="w-full h-full"
      />
    </div>
  )
}