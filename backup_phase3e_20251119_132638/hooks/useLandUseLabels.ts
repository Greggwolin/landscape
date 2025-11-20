import { useEffect, useState } from 'react'
import type { LandUseLabels } from '@/types/containers'

const DEFAULT_LABELS: LandUseLabels = {
  level1Label: 'Family',
  level1LabelPlural: 'Families',
  level2Label: 'Type',
  level2LabelPlural: 'Types',
  level3Label: 'Product',
  level3LabelPlural: 'Products'
}

interface UseLandUseLabelsResult {
  labels: LandUseLabels
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useLandUseLabels(projectId: number): UseLandUseLabelsResult {
  const [labels, setLabels] = useState<LandUseLabels>(DEFAULT_LABELS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLabels = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/config`)
      if (!response.ok) {
        throw new Error('Failed to fetch project config')
      }

      const data = await response.json()
      const config = data.config

      // Extract land use labels with fallback to defaults
      const fetchedLabels: LandUseLabels = {
        level1Label: config.land_use_level1_label || DEFAULT_LABELS.level1Label,
        level1LabelPlural: config.land_use_level1_label_plural || DEFAULT_LABELS.level1LabelPlural,
        level2Label: config.land_use_level2_label || DEFAULT_LABELS.level2Label,
        level2LabelPlural: config.land_use_level2_label_plural || DEFAULT_LABELS.level2LabelPlural,
        level3Label: config.land_use_level3_label || DEFAULT_LABELS.level3Label,
        level3LabelPlural: config.land_use_level3_label_plural || DEFAULT_LABELS.level3LabelPlural
      }

      setLabels(fetchedLabels)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      console.error('Error fetching land use labels:', errorObj)
      // Keep default labels on error
      setLabels(DEFAULT_LABELS)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      void fetchLabels()
    }
  }, [projectId])

  return {
    labels,
    isLoading,
    error,
    refetch: fetchLabels
  }
}
