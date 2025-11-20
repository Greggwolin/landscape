/**
 * Container Helper Functions
 *
 * Utilities for working with the universal container system.
 * Provides backward compatibility with legacy area/phase/parcel structure.
 */

import type { ContainerNode } from '@/types'

export interface FlatContainer {
  division_id: number
  parent_division_id: number | null
  tier: 1 | 2 | 3
  container_code: string
  display_name: string
  sort_order: number | null
  project_id: number
  attributes?: Record<string, any>
  is_active: boolean
}

/**
 * Flatten a hierarchical container tree into a flat array
 */
export function flattenContainers(containers: ContainerNode[]): FlatContainer[] {
  const result: FlatContainer[] = []

  function traverse(nodes: ContainerNode[]) {
    nodes.forEach((node) => {
      result.push({
        division_id: node.division_id,
        parent_division_id: node.parent_division_id ?? null,
        tier: node.tier,
        container_code: node.container_code,
        display_name: node.display_name,
        sort_order: node.sort_order,
        project_id: node.project_id,
        attributes: node.attributes || undefined,
        is_active: node.is_active
      })

      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }

  traverse(containers)
  return result
}

/**
 * Get all containers at a specific level
 */
export function getContainersByLevel(
  containers: FlatContainer[],
  level: 1 | 2 | 3
): FlatContainer[] {
  return containers.filter((c) => c.tier === level)
}

/**
 * Get all children of a specific container
 */
export function getChildren(
  containers: FlatContainer[],
  parentId: number
): FlatContainer[] {
  return containers.filter((c) => c.parent_division_id === parentId)
}

/**
 * Get the parent of a container
 */
export function getParent(
  containers: FlatContainer[],
  divisionId: number
): FlatContainer | null {
  const container = containers.find((c) => c.division_id === divisionId)
  if (!container || !container.parent_division_id) return null

  return containers.find((c) => c.division_id === container.parent_division_id) || null
}

/**
 * Build a path from a container to root
 * Returns array [level1, level2, level3] or [level1, level2] depending on depth
 */
export function getContainerPath(
  containers: FlatContainer[],
  divisionId: number
): FlatContainer[] {
  const path: FlatContainer[] = []
  let current = containers.find((c) => c.division_id === divisionId)

  while (current) {
    path.unshift(current)
    current = current.parent_division_id
      ? containers.find((c) => c.division_id === current!.parent_division_id)
      : undefined
  }

  return path
}

/**
 * Map legacy area_no to Level 1 container
 * Looks for area_id in attributes or matches by display name pattern
 */
export function findLevel1ByAreaNo(
  containers: FlatContainer[],
  areaNo: number
): FlatContainer | null {
  const level1Containers = getContainersByLevel(containers, 1)

  // Try to find by attributes.area_no
  const byAttribute = level1Containers.find(
    (c) => c.attributes?.area_no === areaNo || c.attributes?.areaNo === areaNo
  )
  if (byAttribute) return byAttribute

  // Try to find by display name pattern (e.g., "Plan Area 1")
  const byName = level1Containers.find((c) => {
    const match = c.display_name.match(/(\d+)$/)
    return match && parseInt(match[1]) === areaNo
  })

  return byName || null
}

/**
 * Map legacy phase_no to Level 2 container
 */
export function findLevel2ByPhaseNo(
  containers: FlatContainer[],
  areaNo: number,
  phaseNo: number
): FlatContainer | null {
  const level1 = findLevel1ByAreaNo(containers, areaNo)
  if (!level1) return null

  const level2Containers = getChildren(containers, level1.division_id)

  // Try attributes first
  const byAttribute = level2Containers.find(
    (c) => c.attributes?.phase_no === phaseNo || c.attributes?.phaseNo === phaseNo
  )
  if (byAttribute) return byAttribute

  // Try display name pattern
  const byName = level2Containers.find((c) => {
    const match = c.display_name.match(/(\d+)\.(\d+)$/)
    return match && parseInt(match[2]) === phaseNo
  })

  return byName || null
}

/**
 * Check if container system is being used for a project
 * Returns true if containers exist, false if should use legacy tables
 */
export function hasContainerData(containers: ContainerNode[] | undefined | null): boolean {
  return Array.isArray(containers) && containers.length > 0
}

/**
 * Create a new container payload for API
 */
export function createContainerPayload(data: {
  project_id: number
  parent_division_id: number | null
  tier: 1 | 2 | 3
  container_code: string
  display_name: string
  sort_order?: number
  attributes?: Record<string, any>
}) {
  return {
    project_id: data.project_id,
    parent_division_id: data.parent_division_id,
    tier: data.tier,
    container_code: data.container_code,
    display_name: data.display_name,
    sort_order: data.sort_order ?? 0,
    attributes: data.attributes || {},
    is_active: true
  }
}

/**
 * Generate a unique container code
 */
export function generateContainerCode(
  level: 1 | 2 | 3,
  sequence: number,
  parentCode?: string
): string {
  const prefix = level === 1 ? 'L1' : level === 2 ? 'L2' : 'L3'
  if (parentCode) {
    return `${parentCode}-${prefix}-${sequence}`
  }
  return `${prefix}-${sequence}`
}

/**
 * Sort containers by sort_order, then by ID
 */
export function sortContainers(containers: FlatContainer[]): FlatContainer[] {
  return [...containers].sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.division_id - b.division_id
  })
}
