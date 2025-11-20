import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  containerId: string
}

type ContainerRow = {
  container_id: number
  project_id: number
  parent_container_id: number | null
  container_level: number
  container_code: string
  display_name: string
  sort_order: number | null
  attributes: unknown
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { containerId } = await params
  const id = Number(containerId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid container id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { container_code, display_name, sort_order, attributes, is_active } = body

    // Check container exists
    const existingCheck = await sql<ContainerRow[]>`
      SELECT * FROM landscape.tbl_container
      WHERE container_id = ${id}
    `

    if (existingCheck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTAINER_NOT_FOUND',
            message: `Container with ID ${id} does not exist`,
          },
        },
        { status: 404 }
      )
    }

    const existing = existingCheck[0]

    // If updating container_code, check for duplicates
    if (container_code && container_code !== existing.container_code) {
      const duplicateCheck = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM landscape.tbl_container
        WHERE project_id = ${existing.project_id}
          AND container_code = ${container_code}
          AND container_id != ${id}
      `

      if (duplicateCheck[0].count > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_CONTAINER_CODE',
              message: 'Container code already exists in project',
              details: {
                container_code,
              },
            },
          },
          { status: 400 }
        )
      }
    }

    // Validate display_name if provided
    if (display_name !== undefined && display_name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'display_name cannot be empty',
            details: { field: 'display_name' },
          },
        },
        { status: 400 }
      )
    }

    // Validate at least one field to update
    if (
      container_code === undefined &&
      display_name === undefined &&
      sort_order === undefined &&
      attributes === undefined &&
      is_active === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update provided',
          },
        },
        { status: 400 }
      )
    }

    // Execute update with conditional field updates using COALESCE
    // This allows partial updates - only provided fields are changed
    const updated = await sql<ContainerRow[]>`
      UPDATE landscape.tbl_container
      SET
        container_code = COALESCE(${container_code ?? null}, container_code),
        display_name = COALESCE(${display_name ?? null}, display_name),
        sort_order = COALESCE(${sort_order ?? null}, sort_order),
        attributes = COALESCE(${attributes ? JSON.stringify(attributes) : null}::jsonb, attributes),
        is_active = COALESCE(${is_active ?? null}, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE container_id = ${id}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTAINER_NOT_FOUND',
            message: `Container with ID ${id} not found after update`,
          },
        },
        { status: 404 }
      )
    }

    const result = updated[0]

    return NextResponse.json({
      success: true,
      data: {
        container_id: result.container_id,
        project_id: result.project_id,
        parent_container_id: result.parent_container_id,
        container_level: result.container_level,
        container_code: result.container_code,
        display_name: result.display_name,
        sort_order: result.sort_order,
        attributes: result.attributes,
        is_active: result.is_active,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to update container', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update container',
          details: message,
        },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { containerId } = await params
  const id = Number(containerId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid container id' }, { status: 400 })
  }

  try {
    // Check if container can be safely deleted
    const canDeleteCheck = await sql<
      [
        {
          can_delete: boolean
          reason: string
          child_count: number
          budget_count: number
          actual_count: number
        }
      ]
    >`
      SELECT * FROM landscape.can_delete_container(${id})
    `

    if (canDeleteCheck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTAINER_NOT_FOUND',
            message: `Container with ID ${id} does not exist`,
          },
        },
        { status: 404 }
      )
    }

    const deleteCheck = canDeleteCheck[0]

    if (!deleteCheck.can_delete) {
      // Determine specific error code
      let errorCode = 'DELETE_BLOCKED'
      if (deleteCheck.child_count > 0) {
        errorCode = 'HAS_CHILD_CONTAINERS'
      } else if (deleteCheck.budget_count > 0) {
        errorCode = 'HAS_BUDGET_ITEMS'
      } else if (deleteCheck.actual_count > 0) {
        errorCode = 'HAS_ACTUAL_COSTS'
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: `Cannot delete container: ${deleteCheck.reason}`,
            details: {
              container_id: id,
              child_count: deleteCheck.child_count,
              budget_count: deleteCheck.budget_count,
              actual_count: deleteCheck.actual_count,
            },
          },
        },
        { status: 403 }
      )
    }

    // Safe to delete - use soft delete (set is_active = false)
    const deleted = await sql<ContainerRow[]>`
      UPDATE landscape.tbl_container
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE container_id = ${id}
      RETURNING *
    `

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTAINER_NOT_FOUND',
            message: `Container with ID ${id} does not exist`,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Container deleted successfully',
      data: {
        container_id: id,
        deleted_at: new Date().toISOString(),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to delete container', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete container',
          details: message,
        },
      },
      { status: 500 }
    )
  }
}
