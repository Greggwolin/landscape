import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  projectId: string
  itemId: string
}

interface InventoryItem {
  item_id: number
  project_id: number
  property_type: string
  item_code: string
  hierarchy_values: Record<string, any>
  division_id: number | null
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
}

// PATCH /api/projects/:projectId/inventory/:itemId
// Updates an inventory item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, itemId } = await params
  const projId = Number(projectId)
  const itmId = Number(itemId)

  if (!Number.isFinite(projId) || !Number.isFinite(itmId)) {
    return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const {
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
      notes,
      family_id,
      type_id,
      product_id
    } = body

    // Check item exists
    const existingCheck = await sql<InventoryItem[]>`
      SELECT * FROM landscape.tbl_inventory_item
      WHERE item_id = ${itmId} AND project_id = ${projId}
    `

    if (existingCheck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Inventory item ${itmId} not found`
          }
        },
        { status: 404 }
      )
    }

    // If updating item_code, check for duplicates
    if (item_code && item_code !== existingCheck[0].item_code) {
      const duplicateCheck = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM landscape.tbl_inventory_item
        WHERE project_id = ${projId}
          AND item_code = ${item_code}
          AND item_id != ${itmId}
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
    }

    // If updating product_id, fetch lot dimensions and auto-populate data_values
    let enrichedDataValues = data_values
    if (product_id !== undefined && product_id !== null) {
      const productDetails = await sql<Array<{
        lot_w_ft: number | null
        lot_d_ft: number | null
        lot_area_sf: number | null
      }>>`
        SELECT lot_w_ft, lot_d_ft, lot_area_sf
        FROM landscape.res_lot_product
        WHERE product_id = ${product_id}
      `

      if (productDetails.length > 0) {
        const product = productDetails[0]
        // Merge product dimensions into data_values
        enrichedDataValues = {
          ...(existingCheck[0].data_values || {}),
          ...(data_values || {}),
          lot_w_ft: product.lot_w_ft,
          lot_d_ft: product.lot_d_ft,
          lot_area_sf: product.lot_area_sf
        }
      }
    }

    // Update using COALESCE for partial updates
    const updated = await sql<InventoryItem[]>`
      UPDATE landscape.tbl_inventory_item
      SET
        item_code = COALESCE(${item_code ?? null}, item_code),
        hierarchy_values = COALESCE(${hierarchy_values ? JSON.stringify(hierarchy_values) : null}::jsonb, hierarchy_values),
        data_values = COALESCE(${enrichedDataValues ? JSON.stringify(enrichedDataValues) : null}::jsonb, data_values),
        available_date = COALESCE(${available_date ?? null}, available_date),
        absorption_month = COALESCE(${absorption_month ?? null}, absorption_month),
        lease_start_date = COALESCE(${lease_start_date ?? null}, lease_start_date),
        lease_end_date = COALESCE(${lease_end_date ?? null}, lease_end_date),
        status = COALESCE(${status ?? null}, status),
        is_speculative = COALESCE(${is_speculative ?? null}, is_speculative),
        sort_order = COALESCE(${sort_order ?? null}, sort_order),
        notes = COALESCE(${notes ?? null}, notes),
        family_id = COALESCE(${family_id ?? null}, family_id),
        type_id = COALESCE(${type_id ?? null}, type_id),
        product_id = COALESCE(${product_id ?? null}, product_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE item_id = ${itmId} AND project_id = ${projId}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update inventory item'
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: 'Inventory item updated successfully'
    })
  } catch (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update inventory item',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:projectId/inventory/:itemId
// Soft deletes an inventory item (sets is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, itemId } = await params
  const projId = Number(projectId)
  const itmId = Number(itemId)

  if (!Number.isFinite(projId) || !Number.isFinite(itmId)) {
    return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
  }

  try {
    // Soft delete (set is_active = false)
    const deleted = await sql<InventoryItem[]>`
      UPDATE landscape.tbl_inventory_item
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE item_id = ${itmId}
        AND project_id = ${projId}
      RETURNING *
    `

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Inventory item ${itmId} not found`
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully',
      data: {
        item_id: itmId,
        deleted_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to delete inventory item:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete inventory item',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}
