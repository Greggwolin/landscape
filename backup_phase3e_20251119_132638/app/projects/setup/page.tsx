'use client'

import { useRouter } from 'next/navigation'
import { ProjectSetupWizard } from '@/app/components/ContainerManagement/ProjectSetupWizard'
import type { ProjectSetupWizardProps } from '@/app/components/ContainerManagement/ProjectSetupWizard'

export default function ProjectSetupPage() {
  const router = useRouter()

  const handleComplete: ProjectSetupWizardProps['onComplete'] = async (data) => {
    try {
      const response = await fetch('/api/projects/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create project')
      }

      // Success! Redirect to the new project
      router.push(`/?projectId=${result.projectId}`)
    } catch (error) {
      console.error('Error creating project:', error)
      alert(error instanceof Error ? error.message : 'Failed to create project')
    }
  }

  const handleCancel = () => {
    router.push('/')
  }

  return (
    <ProjectSetupWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  )
}
