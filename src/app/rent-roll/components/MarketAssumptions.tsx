'use client'

interface MarketAssumptionsProps {
  projectId: number
}

export default function MarketAssumptions({ projectId }: MarketAssumptionsProps) {
  return (
    <div className="p-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          Market Assumptions
        </h2>
        <p className="text-gray-400">
          Market rent assumptions by unit type will appear here.
          This section will be built in Phase 2.
        </p>
      </div>
    </div>
  )
}
