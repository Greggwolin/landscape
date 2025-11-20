'use client'

import React, { useState, useEffect } from 'react'

interface MigrationStatus {
  total: number
  migrated: number
  pending: number
}

interface TaxonomyMappingSummary {
  family_name: string
  density_code: string
  type_code: string
  product_code?: string
  legacy_landuse_code: string
}

interface MigrationReport {
  totalParcels: number
  migratedParcels: number
  unmappedCodes: string[]
  errors: string[]
  mappings: Record<string, TaxonomyMappingSummary>
  message: string
}

const TaxonomyMigration: React.FC = () => {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [report, setReport] = useState<MigrationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load migration status on component mount
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/landuse/migration?action=status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        setError('Failed to load migration status')
      }
    } catch (err) {
      setError('Error loading migration status')
      console.error('Status load error:', err)
    }
  }

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const response = await fetch('/api/landuse/migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true })
      })

      if (response.ok) {
        const data = await response.json()
        setReport(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Migration analysis failed')
      }
    } catch (err) {
      setError('Error running migration analysis')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const runMigration = async () => {
    if (!confirm('Are you sure you want to run the migration? This will modify your database.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/landuse/migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: false })
      })

      if (response.ok) {
        const data = await response.json()
        setReport(data)
        await loadStatus() // Refresh status after migration
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Migration failed')
      }
    } catch (err) {
      setError('Error running migration')
      console.error('Migration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Land Use Taxonomy Migration
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Convert existing land use codes to the new four-field taxonomy system
          </p>
        </div>

        <div className="p-6">
          {/* Migration Status */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Current Status</h3>
            {status ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-900">{status.total}</div>
                  <div className="text-sm text-blue-700">Total Parcels</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-900">{status.migrated}</div>
                  <div className="text-sm text-green-700">Migrated</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-900">{status.pending}</div>
                  <div className="text-sm text-yellow-700">Pending</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Loading status...</div>
            )}
          </div>

          {/* Actions */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Run Analysis (Dry Run)'}
              </button>

              <button
                onClick={runMigration}
                disabled={loading || !report}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Migrating...' : 'Run Migration'}
              </button>

              <button
                onClick={loadStatus}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Status
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Error</div>
              <div className="text-red-700 text-sm mt-1">{error}</div>
            </div>
          )}

          {/* Migration Report */}
          {report && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Migration Report</h3>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">{report.message}</div>
                <div className="mt-2 text-xs text-gray-600">
                  {report.totalParcels} total parcels, {report.migratedParcels} migrated
                </div>
              </div>

              {/* Unmapped Codes */}
              {report.unmappedCodes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-yellow-800 font-medium mb-2">
                    Unmapped Land Use Codes ({report.unmappedCodes.length})
                  </div>
                  <div className="text-sm text-yellow-700">
                    These codes do not have automatic mappings and will use default values:
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {report.unmappedCodes.map(code => (
                      <span key={code} className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Migration Mappings */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-gray-800 font-medium mb-2">Taxonomy Mappings</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(report.mappings).map(([code, mapping]) => (
                    <div key={code} className="text-xs bg-white border border-gray-200 rounded p-2">
                      <div className="font-mono font-medium">{code}</div>
                      <div className="text-gray-600">
                        {mapping.family_name} → {mapping.density_code} → {mapping.type_code}
                        {mapping.product_code && ` → ${mapping.product_code}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errors */}
              {report.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium mb-2">
                    Migration Errors ({report.errors.length})
                  </div>
                  <div className="space-y-1">
                    {report.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaxonomyMigration
