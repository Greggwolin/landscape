'use client'

interface AnalysisDashboardProps {
  projectId: number
}

export default function AnalysisDashboard({ projectId }: AnalysisDashboardProps) {
  return (
    <div className="p-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          Loss-to-Lease Analysis
        </h2>
        <p className="text-gray-400">
          Occupancy metrics and loss-to-lease calculations will appear here.
          This section will be built in Phase 2.
        </p>
      </div>
    </div>
  )
}
