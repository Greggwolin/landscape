import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  projectId: string
}

interface ColumnMapping {
  [key: string]: string // Maps CSV column name to database column name
}

interface ImportRow {
  [key: string]: any
}

// POST /api/projects/:projectId/inventory/import
// Bulk import inventory items from CSV data
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
      column_mapping, // Maps CSV columns to hierarchy/data columns
      data, // Array of arrays (CSV rows)
      create_columns = true // Whether to auto-create column configuration
    } = body as {
      property_type: string
      column_mapping: ColumnMapping
      data: any[][]
      create_columns?: boolean
    }

    if (!property_type || !column_mapping || !data || !Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'property_type, column_mapping, and data array are required'
          }
        },
        { status: 400 }
      )
    }

    const imported: any[] = []
    const errors: any[] = []
    let containersCreated = {
      level_2: 0,
      level_3: 0,
      level_4: 0,
      level_5: 0
    }

    // Get existing columns to determine hierarchy vs data
    const existingColumns = await sql<any[]>`
      SELECT column_name, column_type, container_level
      FROM landscape.tbl_project_inventory_columns
      WHERE project_id = ${id}
    `

    const columnMap = new Map(
      existingColumns.map(col => [col.column_name, col])
    )

    // Get column headers from first row (if not provided in mapping keys)
    const headers = Object.keys(column_mapping)

    // Process each row
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex]

      try {
        // Build row object from array using column mapping
        const rowData: ImportRow = {}
        headers.forEach((header, index) => {
          const mappedColumn = column_mapping[header]
          if (mappedColumn && row[index] !== undefined && row[index] !== null && row[index] !== '') {
            rowData[mappedColumn] = row[index]
          }
        })

        // Separate hierarchy values from data values
        const hierarchy_values: Record<string, any> = {}
        const data_values: Record<string, any> = {}

        Object.entries(rowData).forEach(([key, value]) => {
          const colInfo = columnMap.get(key)
          if (colInfo) {
            if (colInfo.column_type === 'hierarchy') {
              hierarchy_values[key] = value
            } else {
              data_values[key] = value
            }
          } else {
            // If column doesn't exist in config, treat as data column
            data_values[key] = value
          }
        })

        // Determine item_code (use first hierarchy value or generate)
        const item_code = rowData.item_code ||
                         rowData.lot ||
                         rowData.unit ||
                         rowData.suite ||
                         rowData.room ||
                         rowData.space ||
                         rowData.parcel ||
                         `ITEM-${rowIndex + 1}`

        // Insert inventory item
        const result = await sql<any[]>`
          INSERT INTO landscape.tbl_inventory_item (
            project_id,
            property_type,
            item_code,
            hierarchy_values,
            data_values,
            status,
            sort_order
          ) VALUES (
            ${id},
            ${property_type},
            ${item_code},
            ${JSON.stringify(hierarchy_values)}::jsonb,
            ${JSON.stringify(data_values)}::jsonb,
            ${rowData.status || 'Available'},
            ${rowIndex}
          )
          RETURNING item_id, container_id
        `

        imported.push({
          row: rowIndex + 1,
          item_code,
          item_id: result[0].item_id,
          container_id: result[0].container_id
        })

        // Count containers created at each level (trigger auto-creates them)
        if (result[0].container_id) {
          const containerLevel = await sql<[{ container_level: number }]>`
            SELECT container_level
            FROM landscape.tbl_container
            WHERE container_id = ${result[0].container_id}
          `
          if (containerLevel.length > 0) {
            const level = containerLevel[0].container_level
            if (level === 2) containersCreated.level_2++
            if (level === 3) containersCreated.level_3++
            if (level === 4) containersCreated.level_4++
            if (level === 5) containersCreated.level_5++
          }
        }
      } catch (rowError) {
        errors.push({
          row: rowIndex + 1,
          error: rowError instanceof Error ? rowError.message : String(rowError),
          data: row
        })
      }
    }

    // Get unique container counts (since trigger may reuse existing)
    const containerCounts = await sql<any[]>`
      SELECT
        container_level,
        COUNT(DISTINCT container_id) as count
      FROM landscape.tbl_container
      WHERE project_id = ${id}
        AND is_active = true
        AND container_level > 1
      GROUP BY container_level
      ORDER BY container_level
    `

    const finalContainerCounts: Record<string, number> = {}
    containerCounts.forEach(row => {
      finalContainerCounts[`level_${row.container_level}`] = row.count
    })

    return NextResponse.json({
      success: true,
      data: {
        imported_count: imported.length,
        error_count: errors.length,
        imported_items: imported,
        errors: errors.length > 0 ? errors : undefined,
        containers_created: finalContainerCounts
      },
      message: `Successfully imported ${imported.length} items${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    })
  } catch (error) {
    console.error('Failed to import inventory:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to import inventory',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}
