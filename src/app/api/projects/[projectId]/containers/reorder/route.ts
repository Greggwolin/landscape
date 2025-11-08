import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  projectId: string
}

export async function PATCH(
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
    const { updates } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'updates must be a non-empty array',
          },
        },
        { status: 400 }
      )
    }

    // Validate all updates
    for (const update of updates) {
      if (
        typeof update.container_id !== 'number' ||
        typeof update.sort_order !== 'number'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each update must have container_id (number) and sort_order (number)',
              details: update,
            },
          },
          { status: 400 }
        )
      }
    }

    // Check all containers exist and belong to this project
    const containerIds = updates.map((u) => u.container_id)
    const existingContainers = await sql<
      [{ container_id: number; project_id: number; parent_container_id: number | null }]
    >`
      SELECT container_id, project_id, parent_container_id
      FROM landscape.tbl_container
      WHERE container_id = ANY(${containerIds})
    `

    if (existingContainers.length !== containerIds.length) {
      const foundIds = existingContainers.map((c) => c.container_id)
      const missingIds = containerIds.filter((id) => !foundIds.includes(id))

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTAINER_NOT_FOUND',
            message: 'One or more containers do not exist',
            details: { missing_container_ids: missingIds },
          },
        },
        { status: 404 }
      )
    }

    // Verify all containers belong to this project
    const wrongProject = existingContainers.find((c) => c.project_id !== id)
    if (wrongProject) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PROJECT',
            message: 'One or more containers do not belong to this project',
            details: {
              container_id: wrongProject.container_id,
              expected_project_id: id,
              actual_project_id: wrongProject.project_id,
            },
          },
        },
        { status: 400 }
      )
    }

    // Verify all containers have same parent (reorder within same level)
    const parents = new Set(
      existingContainers.map((c) => c.parent_container_id)
    )
    if (parents.size > 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REORDER',
            message: 'All containers must have the same parent (reorder within same level only)',
            details: {
              parent_ids: Array.from(parents),
            },
          },
        },
        { status: 400 }
      )
    }

    // Execute updates in transaction
    await sql.begin(async (txn) => {
      for (const update of updates) {
        await txn`
          UPDATE landscape.tbl_container
          SET sort_order = ${update.sort_order}, updated_at = CURRENT_TIMESTAMP
          WHERE container_id = ${update.container_id}
        `
      }
    })

    // Return updated containers
    const updated = await sql<
      [{ container_id: number; sort_order: number | null }]
    >`
      SELECT container_id, sort_order
      FROM landscape.tbl_container
      WHERE container_id = ANY(${containerIds})
      ORDER BY sort_order NULLS LAST
    `

    return NextResponse.json({
      success: true,
      message: 'Containers reordered successfully',
      data: {
        updated_count: updated.length,
        containers: updated,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to reorder containers', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reorder containers',
          details: message,
        },
      },
      { status: 500 }
    )
  }
}
