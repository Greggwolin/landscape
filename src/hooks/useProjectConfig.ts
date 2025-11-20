import { useMemo } from 'react'
import useSWR from 'swr'
import type { ProjectConfig, ProjectSettings, ContainerNode } from '@/types'
import { fetchJson } from '@/lib/fetchJson'

const fetcher = (url: string) => fetchJson(url)

export interface ProjectConfigResult {
  config: ProjectConfig | null
  settings: ProjectSettings | null
  containers: ContainerNode[]
  areaDisplayById: Map<number, string>
  areaDisplayByNumber: Map<number, string>
  phaseDisplayById: Map<number, string>
  parcelDisplayById: Map<number, string>
  labels: {
    level1Label: string
    level2Label: string
    level3Label: string
    level1LabelPlural: string
    level2LabelPlural: string
    level3LabelPlural: string
  }
  isLoading: boolean
  error?: Error
  planningEfficiency: number | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function useProjectConfig(projectId?: number | null): ProjectConfigResult {
  const shouldFetch = typeof projectId === 'number' && Number.isFinite(projectId)
  const { data: configResponse, error: configError } = useSWR(shouldFetch ? `/api/projects/${projectId}/config` : null, fetcher)
  const { data: containersResponse, error: containerError } = useSWR(shouldFetch ? `/api/projects/${projectId}/containers` : null, fetcher)

  const config: ProjectConfig | null = configResponse?.config ?? null
  const settings: ProjectSettings | null = configResponse?.settings ?? null
  const containers: ContainerNode[] = useMemo(
    () => (Array.isArray(containersResponse?.containers) ? containersResponse.containers : []),
    [containersResponse]
  )

  const level1Label = config?.level1_label ?? 'Area'
  const level2Label = config?.level2_label ?? 'Phase'
  const level3Label = config?.level3_label ?? 'Parcel'
  const pluralize = (label: string) => (label.endsWith('s') ? label : `${label}s`)
  const labels = {
    level1Label,
    level2Label,
    level3Label,
    level1LabelPlural: pluralize(level1Label),
    level2LabelPlural: pluralize(level2Label),
    level3LabelPlural: pluralize(level3Label)
  }

  const maps = useMemo(() => {
    const areaById = new Map<number, string>()
    const areaByNumber = new Map<number, string>()
    const phaseById = new Map<number, string>()
    const parcelById = new Map<number, string>()

    const traverse = (nodes: ContainerNode[]) => {
      nodes.forEach(node => {
        const attrs = (node.attributes ?? {}) as Record<string, unknown>
        if (node.tier === 1) {
          const areaId = toNumber(attrs.area_id)
          const areaNumber = toNumber(attrs.area_no ?? attrs.areaNo)
          const display = node.display_name || (areaNumber != null ? `${level1Label} ${areaNumber}` : `${level1Label}`)
          if (areaId != null) areaById.set(areaId, display)
          if (areaNumber != null) areaByNumber.set(areaNumber, display)
        }
        if (node.tier === 2) {
          const phaseId = toNumber(attrs.phase_id)
          const display = node.display_name || `${level2Label}`
          if (phaseId != null) phaseById.set(phaseId, display)
        }
        if (node.tier === 3) {
          const parcelId = toNumber(attrs.parcel_id)
          const display = node.display_name || `${level3Label}`
          if (parcelId != null) parcelById.set(parcelId, display)
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children)
        }
      })
    }

    traverse(containers)

    return { areaById, areaByNumber, phaseById, parcelById }
  }, [containers, level1Label, level2Label, level3Label])

  const isLoading = shouldFetch && (!configResponse || !containersResponse)
  const error = (configError || containerError) as Error | undefined

  const planningEfficiency = configResponse?.planningEfficiency ?? null

  return {
    config,
    settings,
    containers,
    areaDisplayById: maps.areaById,
    areaDisplayByNumber: maps.areaByNumber,
    phaseDisplayById: maps.phaseById,
    parcelDisplayById: maps.parcelById,
    labels,
    isLoading,
    error,
    planningEfficiency
  }
}

export default useProjectConfig
