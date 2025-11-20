import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { ContainerNode } from '@/types'

type Params = {
  projectId: string
}

type ContainerRow = {
  division_id: number
  project_id: number
  parent_division_id: number | null
  tier: number
  container_code: string
  display_name: string
  sort_order: number | null
  attributes: unknown
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

function buildTree(rows: ContainerRow[]): ContainerNode[] {
  const nodes = rows.map<ContainerNode>((row) => ({
    division_id: row.division_id,
    project_id: row.project_id,
    parent_division_id: row.parent_division_id,
    tier: row.tier as ContainerNode['tier'],
    container_code: row.container_code,
    display_name: row.display_name,
    sort_order: row.sort_order ?? null,
    attributes: (row.attributes as Record<string, unknown> | null) ?? null,
    is_active: row.is_active,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    children: [],
  }))

  const map = new Map<number, ContainerNode>()
  nodes.forEach((node) => map.set(node.division_id, node))

  const roots: ContainerNode[] = []
  const childrenByParent = new Map<number, ContainerNode[]>()

  for (const node of nodes) {
    if (node.parent_division_id) {
      const siblings = childrenByParent.get(node.parent_division_id) ?? []
      siblings.push(node)
      childrenByParent.set(node.parent_division_id, siblings)
    } else {
      roots.push(node)
    }
  }

  for (const [parentId, siblings] of childrenByParent.entries()) {
    const parent = map.get(parentId)
    if (parent) {
      siblings.sort((a, b) => {
        const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER
        const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB || a.division_id - b.division_id
      })
      parent.children.push(...siblings)
    }
  }

  roots.sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB || a.division_id - b.division_id
  })

  return roots
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const rows = await sql<ContainerRow[]>`
      SELECT
        division_id,
        project_id,
        parent_division_id,
        tier,
        container_code,
        display_name,
        sort_order,
        attributes,
        is_active,
        created_at,
        updated_at
      FROM landscape.tbl_container
      WHERE project_id = ${id}
      ORDER BY tier, sort_order NULLS LAST, division_id
    `

    const tree = buildTree(rows)
    return NextResponse.json({ containers: tree })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to load containers', error)
    return NextResponse.json(
      { error: 'Failed to load containers', details: message },
      { status: 500 }
    )
  }
}
