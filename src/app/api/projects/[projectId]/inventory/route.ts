import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  projectId: string
}

interface InventoryItem {
  item_id: number
  project_id: number
  property_type: string
  item_code: string
  hierarchy_values: Record<string, any>
  container_id: number | null
  data_values: Record<string, any>
  available_date: string | null
  absorption_month: number | null
  lease_start_date: string | null
  lease_end_date: string | null
  status: string | null
  is_speculative: boolean
  is_active: boolean
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
  family_id?: number | null
  type_id?: number | null
  product_id?: number | null
  family_label?: string | null
  type_label?: string | null
  product_label?: string | null
}

interface ColumnConfig {
  column_config_id: number
  project_id: number
  column_name: string
  column_label: string
  column_type: 'hierarchy' | 'data'
  container_level: number | null
  data_type: string | null
  enum_options: any
  is_required: boolean
  is_visible: boolean
  display_order: number
  default_value: string | null
}

interface PropertyTypeConfig {
  config_id: number
  property_type: string
  tab_label: string
  description: string | null
  default_columns: any
  import_suggestions: any
}

// GET /api/projects/:projectId/inventory
// Fetches all inventory items and column configuration for a project
export async function GET(request: Request, context: { params: Params }) {
  const { projectId } = await context.params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    // Get project to determine property type
    const projectResult = await sql<[{ project_type: string }]>`
      SELECT project_type
      FROM landscape.tbl_project
      WHERE project_id = ${id}
    `

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const propertyType = projectResult[0].project_type || 'mpc'

    // Get property type configuration
    const configResult = await sql<PropertyTypeConfig[]>`
      SELECT *
      FROM landscape.tbl_property_type_config
      WHERE property_type = ${propertyType}
    `

    const typeConfig = configResult[0] || null

    // Get project-specific column configuration
    const columnsResult = await sql<ColumnConfig[]>`
      SELECT *
      FROM landscape.tbl_project_inventory_columns
      WHERE project_id = ${id}
      ORDER BY display_order ASC
    `

    // Get inventory items with land use labels
    const itemsResult = await sql<InventoryItem[]>`
      SELECT
        i.*,
        f.name as family_label,
        t.name as type_label,
        p.code as product_label
      FROM landscape.tbl_inventory_item i
      LEFT JOIN landscape.lu_family f ON i.family_id = f.family_id
      LEFT JOIN landscape.lu_type t ON i.type_id = t.type_id
      LEFT JOIN landscape.res_lot_product p ON i.product_id = p.product_id
      WHERE i.project_id = ${id}
        AND i.is_active = true
      ORDER BY i.sort_order ASC, i.item_code ASC
    `

    return NextResponse.json({
      success: true,
      data: {
        property_type: propertyType,
        type_config: typeConfig,
        columns: columnsResult,
        items: itemsResult,
        count: itemsResult.length
      }
    })
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch inventory',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/projects/:projectId/inventory
// Creates a new inventory item
export async function POST(request: Request, context: { params: Params }) {
  const { projectId } = await context.params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const {
      property_type,
      item_code,
      hierarchy_values = {},
      data_values = {},
      available_date,
      absorption_month,
      lease_start_date,
      lease_end_date,
      status,
      is_speculative = false,
      sort_order = 0,
      notes
    } = body

    // Validate required fields
    if (!property_type || !item_code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'property_type and item_code are required'
          }
        },
        { status: 400 }
      )
    }

    // Check for duplicate item_code
    const duplicateCheck = await sql<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM landscape.tbl_inventory_item
      WHERE project_id = ${id}
        AND item_code = ${item_code}
        AND is_active = true
    `

    if (duplicateCheck[0].count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ITEM_CODE',
            message: `Item with code "${item_code}" already exists`
          }
        },
        { status: 400 }
      )
    }

    // Insert inventory item
    const result = await sql<InventoryItem[]>`
      INSERT INTO landscape.tbl_inventory_item (
        project_id,
        property_type,
        item_code,
        hierarchy_values,
        data_values,
        available_date,
        absorption_month,
        lease_start_date,
        lease_end_date,
        status,
        is_speculative,
        sort_order,
        notes
      ) VALUES (
        ${id},
        ${property_type},
        ${item_code},
        ${JSON.stringify(hierarchy_values)}::jsonb,
        ${JSON.stringify(data_values)}::jsonb,
        ${available_date || null},
        ${absorption_month || null},
        ${lease_start_date || null},
        ${lease_end_date || null},
        ${status || null},
        ${is_speculative},
        ${sort_order},
        ${notes || null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Inventory item created successfully'
    })
  } catch (error) {
    console.error('Failed to create inventory item:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create inventory item',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}
