'use client'

import { useProjectContext } from '@/app/components/ProjectProvider'
import RentRollGrid from './components/RentRollGrid'
import FloorplansGrid from './components/FloorplansGrid'

export default function RentRollPage() {
  const { activeProject, isLoading } = useProjectContext()

  const projectId = activeProject?.project_id ?? null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading project...</div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2">No Project Selected</h2>
          <p className="text-gray-400">Please select a project from the header to view the rent roll.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Multifamily Analysis</h1>
              <p className="text-sm text-gray-400 mt-1">
                {activeProject?.project_name || 'Unknown Project'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Single Scrollable View: Floorplans on top, Rent Roll below */}
      <div className="flex-1">
        {/* Unit Mix / Floor Plans Section */}
        <div className="border-b border-gray-800">
          <div className="px-6 py-4 bg-gray-900">
            <h2 className="text-lg font-semibold text-white">Unit Mix (Floor Plans)</h2>
            <p className="text-sm text-gray-400 mt-1">
              Define unit types and counts. System will analyze rent roll to create floor plans automatically.
            </p>
          </div>
          <FloorplansGrid projectId={projectId} />
        </div>

        {/* Rent Roll Section */}
        <div>
          <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Rent Roll</h2>
            <p className="text-sm text-gray-400 mt-1">
              Individual units with tenant details. Import CSV or enter manually.
            </p>
          </div>
          <RentRollGrid projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
