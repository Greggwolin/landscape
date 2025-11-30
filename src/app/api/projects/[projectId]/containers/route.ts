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
    division_id: Number(row.division_id),
    project_id: Number(row.project_id),
    parent_division_id: row.parent_division_id ? Number(row.parent_division_id) : null,
    tier: Number(row.tier) as ContainerNode['tier'],
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
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const includeCosts = searchParams.get('includeCosts') === 'true'

  try {
    // Step 1: Get all containers with their direct inventory data
    const rows = await sql<ContainerRow[]>`
      SELECT
        c.division_id,
        c.project_id,
        c.parent_division_id,
        c.tier,
        c.division_code as container_code,
        c.display_name,
        c.sort_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        -- Aggregate direct inventory data
        CASE
          WHEN COUNT(i.item_id) > 0 THEN
            jsonb_build_object(
              'units_total', COALESCE(SUM((i.data_values->>'units_total')::numeric), 0),
              'units', COALESCE(SUM((i.data_values->>'units_total')::numeric), 0),
              'acres_gross', COALESCE(SUM((i.data_values->>'acres_gross')::numeric), 0),
              'acres', COALESCE(SUM((i.data_values->>'acres_gross')::numeric), 0),
              'family_name', MAX(f.name),
              'type_name', MAX(t.name),
              'status', 'active'
            )
          ELSE
            COALESCE(c.attributes, '{}'::jsonb)
        END as attributes
      FROM landscape.tbl_division c
      LEFT JOIN landscape.tbl_inventory_item i ON i.container_id = c.division_id AND i.is_active = true
      LEFT JOIN landscape.lu_family f ON i.family_id = f.family_id
      LEFT JOIN landscape.lu_type t ON i.type_id = t.type_id
      WHERE c.project_id = ${id}
        AND c.is_active = true
      GROUP BY c.division_id, c.project_id, c.parent_division_id, c.tier,
               c.division_code, c.display_name, c.sort_order, c.attributes,
               c.is_active, c.created_at, c.updated_at
      ORDER BY c.tier, c.sort_order NULLS LAST, c.division_id
    `

    // Step 1.2: Get parcel aggregations for phases (tier=2)
    // Maps division_id -> {units, acres, parcel_count}
    const parcelMap: Map<number, { units: number; acres: number; parcel_count: number }> = new Map()
    const parcelAggregations = await sql<Array<{
      division_id: number;
      units: number;
      acres: number;
      parcel_count: number;
    }>>`
      SELECT
        d.division_id,
        COALESCE(SUM(p.units_total), 0)::int as units,
        COALESCE(SUM(p.acres_gross), 0)::int as acres,
        COUNT(p.parcel_id)::int as parcel_count
      FROM landscape.tbl_division d
      JOIN landscape.tbl_phase ph
        ON ph.phase_name = d.display_name
        AND ph.project_id = d.project_id
      LEFT JOIN landscape.tbl_parcel p ON p.phase_id = ph.phase_id
      WHERE d.project_id = ${id}
        AND d.tier = 2
      GROUP BY d.division_id
    `
    parcelAggregations.forEach(row => {
      parcelMap.set(row.division_id, {
        units: Number(row.units),
        acres: Number(row.acres),
        parcel_count: Number(row.parcel_count)
      })
    })

    // Merge parcel data into rows
    for (const row of rows) {
      const parcelData = parcelMap.get(row.division_id)
      if (parcelData && (parcelData.units > 0 || parcelData.acres > 0)) {
        const existingAttrs = (row.attributes as Record<string, unknown>) || {}
        row.attributes = {
          ...existingAttrs,
          units_total: parcelData.units,
          units: parcelData.units,
          acres_gross: parcelData.acres,
          acres: parcelData.acres,
          parcel_count: parcelData.parcel_count,
          status: 'active'
        }
      }
    }

    // Step 1.5: Get budget costs if requested
    const costMap: Map<number, number> = new Map()
    if (includeCosts) {
      const costs = await sql<Array<{ division_id: number; total_cost: number }>>`
        SELECT
          division_id,
          COALESCE(SUM(amount), 0) as total_cost
        FROM landscape.core_fin_fact_budget
        WHERE project_id = ${id}
          AND division_id IS NOT NULL
        GROUP BY division_id
      `
      costs.forEach(row => costMap.set(row.division_id, Number(row.total_cost)))
    }

    // Step 2: Build tree structure
    const tree = buildTree(rows)

    // Step 3: Recursively aggregate child data up to parents
    function aggregateChildData(node: ContainerNode): void {
      if (node.children && node.children.length > 0) {
        // First, recursively process all children
        node.children.forEach(child => aggregateChildData(child))

        // Then aggregate their data from children
        let totalUnits = 0
        let totalAcres = 0
        let totalChildCosts = 0

        node.children.forEach(child => {
          if (child.attributes) {
            const childUnits = Number(child.attributes.units_total || child.attributes.units || 0)
            const childAcres = Number(child.attributes.acres_gross || child.attributes.acres || 0)
            totalUnits += childUnits
            totalAcres += childAcres

            // Aggregate child costs
            if (includeCosts && child.attributes.total_cost !== undefined) {
              totalChildCosts += Number(child.attributes.total_cost || 0)
            }
          }
        })

        // Get existing attributes (may have been set from parcel aggregation query)
        const existingAttrs = (node.attributes || {}) as Record<string, unknown>
        const existingUnits = Number(existingAttrs.units_total || existingAttrs.units || 0)
        const existingAcres = Number(existingAttrs.acres_gross || existingAttrs.acres || 0)

        // Use child aggregation if it has data, otherwise keep existing values
        const finalUnits = totalUnits > 0 ? totalUnits : existingUnits
        const finalAcres = totalAcres > 0 ? totalAcres : existingAcres

        // Update parent's attributes - preserve existing data, add aggregated data
        node.attributes = {
          ...existingAttrs,
          units_total: finalUnits,
          units: finalUnits,
          acres_gross: finalAcres,
          acres: finalAcres,
          status: 'active'
        }

        // Add cost data if requested
        if (includeCosts) {
          const directCost = costMap.get(node.division_id) || 0
          node.attributes.direct_cost = directCost
          node.attributes.child_cost = totalChildCosts
          node.attributes.total_cost = directCost + totalChildCosts
        }
      } else if (includeCosts) {
        // Leaf node - just add direct cost, preserve existing attributes
        const directCost = costMap.get(node.division_id) || 0
        node.attributes = {
          ...(node.attributes || {}),
          direct_cost: directCost,
          child_cost: 0,
          total_cost: directCost
        }
      }
    }

    // Apply aggregation to all root nodes
    tree.forEach(root => aggregateChildData(root))

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const {
      tier,
      parent_division_id,
      container_code,
      display_name,
      sort_order,
      attributes,
    } = body

    // Validation
    if (!display_name || display_name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'display_name is required',
            details: { field: 'display_name' },
          },
        },
        { status: 400 }
      )
    }

    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'tier must be 1, 2, or 3',
            details: { field: 'tier', value: tier },
          },
        },
        { status: 400 }
      )
    }

    // Level 1 must not have parent
    if (tier === 1 && parent_division_id != null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Level 1 containers cannot have a parent',
            details: { tier, parent_division_id },
          },
        },
        { status: 400 }
      )
    }

    // Level 2/3 must have parent
    if ((tier === 2 || tier === 3) && parent_division_id == null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Level ${tier} containers must have a parent`,
            details: { tier },
          },
        },
        { status: 400 }
      )
    }

    // Auto-generate container_code if not provided
    let finalCode = container_code
    if (!finalCode || finalCode.trim().length === 0) {
      const codeResult = await sql<[{ generate_container_code: string }]>`
        SELECT landscape.generate_container_code(${id}, ${tier}, ${parent_division_id ?? null})
      `
      finalCode = codeResult[0].generate_container_code
    }

    // Check for duplicate container_code
    const existingCode = await sql<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM landscape.tbl_container
      WHERE project_id = ${id}
        AND container_code = ${finalCode}
    `

    if (existingCode[0].count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CONTAINER_CODE',
            message: 'Container code already exists in project',
            details: {
              field: 'container_code',
              value: finalCode,
            },
          },
        },
        { status: 400 }
      )
    }

    // If parent provided, validate it exists and is correct level
    if (parent_division_id != null) {
      const parentCheck = await sql<
        [{ project_id: number; tier: number; division_id: number }]
      >`
        SELECT project_id, tier, division_id
        FROM landscape.tbl_container
        WHERE division_id = ${parent_division_id}
      `

      if (parentCheck.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PARENT_NOT_FOUND',
              message: 'Parent container does not exist',
              details: { parent_division_id },
            },
          },
          { status: 404 }
        )
      }

      const parent = parentCheck[0]
      if (parent.project_id !== id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PARENT_PROJECT',
              message: 'Parent container belongs to different project',
              details: {
                parent_division_id,
                parent_project_id: parent.project_id,
                child_project_id: id,
              },
            },
          },
          { status: 400 }
        )
      }

      if (parent.tier !== tier - 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PARENT_LEVEL',
              message: 'Parent container must be exactly 1 level above',
              details: {
                tier,
                parent_level: parent.tier,
                parent_division_id,
              },
            },
          },
          { status: 400 }
        )
      }
    }

    // Insert container
    const inserted = await sql<ContainerRow[]>`
      INSERT INTO landscape.tbl_container (
        project_id,
        parent_division_id,
        tier,
        container_code,
        display_name,
        sort_order,
        attributes,
        is_active
      ) VALUES (
        ${id},
        ${parent_division_id ?? null},
        ${tier},
        ${finalCode},
        ${display_name},
        ${sort_order ?? null},
        ${attributes ? JSON.stringify(attributes) : '{}'},
        true
      )
      RETURNING *
    `

    const created = inserted[0]

    return NextResponse.json(
      {
        success: true,
        data: {
          division_id: created.division_id,
          project_id: created.project_id,
          parent_division_id: created.parent_division_id,
          tier: created.tier,
          container_code: created.container_code,
          display_name: created.display_name,
          sort_order: created.sort_order,
          attributes: created.attributes,
          is_active: created.is_active,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to create container', error)

    // Check for database constraint violations
    if (message.includes('unique constraint') && message.includes('uq_container_code')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CONTAINER_CODE',
            message: 'Container code already exists in project',
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create container',
          details: message,
        },
      },
      { status: 500 }
    )
  }
}
