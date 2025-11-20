import { useQuery } from '@tanstack/react-query'
import type { ContainerNode } from '@/types'

interface UseContainersOptions {
  projectId: number
  includeCosts?: boolean
}

interface ContainerStats {
  container_id: number
  name: string
  code: string
  level: number
  parent_id: number | null
  acres: number
  units: number
  phaseCount?: number
  parcelCount?: number
  directCost: number
  childCost: number
  totalCost: number
}

interface UseContainersResult {
  containers: ContainerNode[]
  areas: ContainerStats[]
  phases: ContainerStats[]
  parcels: ContainerStats[]
  isLoading: boolean
  error: Error | null
}

/**
 * Counts children at a specific level within a container's subtree
 */
function countChildrenAtLevel(node: ContainerNode, targetLevel: number): number {
  let count = 0

  if (node.container_level === targetLevel) {
    count = 1
  }

  if (node.children) {
    node.children.forEach(child => {
      count += countChildrenAtLevel(child, targetLevel)
    })
  }

  return count
}

/**
 * Flattens container tree and extracts stats for a specific level
 */
function extractLevelStats(
  containers: ContainerNode[],
  level: number
): ContainerStats[] {
  const stats: ContainerStats[] = []

  function traverse(node: ContainerNode) {
    if (node.container_level === level) {
      const attrs = node.attributes || {}
      const acres = Number(attrs.acres || attrs.acres_gross || 0)
      const units = Number(attrs.units || attrs.units_total || 0)
      const directCost = Number(attrs.direct_cost || 0)
      const childCost = Number(attrs.child_cost || 0)
      const totalCost = Number(attrs.total_cost || 0)

      stats.push({
        container_id: node.container_id,
        name: node.display_name,
        code: node.container_code,
        level: node.container_level,
        parent_id: node.parent_container_id,
        acres,
        units,
        phaseCount: level === 1 ? countChildrenAtLevel(node, 2) : undefined,
        parcelCount: countChildrenAtLevel(node, 3),
        directCost,
        childCost,
        totalCost
      })
    }

    if (node.children) {
      node.children.forEach(child => traverse(child))
    }
  }

  containers.forEach(root => traverse(root))
  return stats
}

/**
 * Hook to fetch and process container hierarchy with optional cost data
 */
export function useContainers({
  projectId,
  includeCosts = false
}: UseContainersOptions): UseContainersResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['containers', projectId, includeCosts],
    queryFn: async () => {
      const url = new URL(
        `/api/projects/${projectId}/containers`,
        window.location.origin
      )
      if (includeCosts) {
        url.searchParams.set('includeCosts', 'true')
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch containers')
      }

      const json = await response.json()
      return json.containers as ContainerNode[]
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const containers = data || []
  const areas = extractLevelStats(containers, 1)
  const phases = extractLevelStats(containers, 2)
  const parcels = extractLevelStats(containers, 3)

  return {
    containers,
    areas,
    phases,
    parcels,
    isLoading,
    error: error as Error | null
  }
}
