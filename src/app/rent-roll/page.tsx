'use client'

import { useState } from 'react'
import { useProjectContext } from '@/app/components/ProjectProvider'
import RentRollGrid from './components/RentRollGrid'
import FloorplansGrid from './components/FloorplansGrid'
import { StagingModal } from '@/components/extraction/StagingModal'
import { Button } from '@mui/material'
import UploadIcon from '@mui/icons-material/Upload'

export default function RentRollPage() {
  const { activeProject, isLoading } = useProjectContext()
  const [stagingDocId, setStagingDocId] = useState<number | null>(null)
  const [showStaging, setShowStaging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const projectId = activeProject?.project_id ?? null

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !projectId) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId.toString())
    formData.append('doc_type', 'rent_roll')

    try {
      const response = await fetch('http://localhost:8000/api/dms/upload/', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Show staging modal after brief delay for extraction
        setStagingDocId(result.doc_id)

        // Poll for extraction completion
        const checkInterval = setInterval(async () => {
          const statusResponse = await fetch(`http://localhost:8000/api/dms/staging/${result.doc_id}/`)

          if (statusResponse.status === 200) {
            const statusData = await statusResponse.json()
            if (statusData.summary) {
              clearInterval(checkInterval)
              setUploading(false)
              setShowStaging(true)
            }
          }
        }, 2000)

        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(checkInterval)
          setUploading(false)
          alert('Extraction is taking longer than expected. Please check back later.')
        }, 120000)
      } else {
        setUploading(false)
        alert(`Upload failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setUploading(false)
      alert('Upload failed. Please try again.')
    }
  }

  const handleCommit = () => {
    // Refresh rent roll data
    window.location.reload()
  }

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
            <div>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                disabled={uploading}
              >
                {uploading ? 'Processing...' : 'Upload Rent Roll'}
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv,.pdf"
                />
              </Button>
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

      {/* Staging Modal */}
      {stagingDocId && (
        <StagingModal
          open={showStaging}
          docId={stagingDocId}
          projectId={projectId}
          onClose={() => setShowStaging(false)}
          onCommit={handleCommit}
        />
      )}
    </div>
  )
}
