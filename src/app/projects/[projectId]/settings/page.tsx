'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import ProjectLandUseLabels from '@/components/project/ProjectLandUseLabels'
import { CContainer } from '@coreui/react'

export default function ProjectSettingsPage() {
  const params = useParams()
  const projectId = Number(params.projectId)

  return (
    <CContainer fluid className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Project Settings</h1>
        <p className="text-gray-600">
          Configure project-specific settings and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <ProjectLandUseLabels projectId={projectId} />
      </div>
    </CContainer>
  )
}
