'use client'

import { useProjectContext } from '@/app/components/ProjectProvider'
import UniversalInventoryTable from '@/app/components/UniversalInventory/UniversalInventoryTable'

export default function InventoryPage() {
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
          <p className="text-gray-400">Please select a project from the header to view inventory.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-white">Universal Inventory</h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeProject?.project_name || 'Unknown Project'}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="flex-1">
        <UniversalInventoryTable projectId={projectId} />
      </div>
    </div>
  )
}
