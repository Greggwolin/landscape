// /app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Template = {
  template_id: number
  template_name: string
  property_type: string
  template_category: string | null
  description: string | null
  is_active: boolean
  column_count?: number
}

type TemplateColumn = {
  template_column_id: number
  column_name: string
  column_label: string
  column_type: 'hierarchy' | 'data'
  data_type: string | null
  tier: number | null
  display_order: number
  is_required: boolean
  data_source_table: string | null
  data_source_value_col: string | null
  data_source_label_col: string | null
  parent_column_name: string | null
  junction_table: string | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const propertyType = searchParams.get('property_type')
  const templateId = searchParams.get('template_id')
  const includeColumns = searchParams.get('include_columns') === 'true'

  try {
    // Get specific template with columns
    if (templateId) {
      const templates = await sql<Template[]>`
        SELECT
          template_id,
          template_name,
          property_type,
          template_category,
          description,
          is_active
        FROM landscape.tbl_property_use_template
        WHERE template_id = ${parseInt(templateId)}
          AND is_active = true
      `

      if (templates.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      const columns = await sql<TemplateColumn[]>`
        SELECT
          template_column_id,
          column_name,
          column_label,
          column_type,
          data_type,
          tier,
          display_order,
          is_required,
          data_source_table,
          data_source_value_col,
          data_source_label_col,
          parent_column_name,
          junction_table
        FROM landscape.tbl_template_column_config
        WHERE template_id = ${parseInt(templateId)}
        ORDER BY display_order
      `

      return NextResponse.json({
        template: templates[0],
        columns
      })
    }

    // Get templates list (optionally filtered by property type)
    let templates: Template[]

    if (propertyType) {
      templates = await sql<Template[]>`
        SELECT
          t.template_id,
          t.template_name,
          t.property_type,
          t.template_category,
          t.description,
          t.is_active,
          COUNT(c.template_column_id)::int as column_count
        FROM landscape.tbl_property_use_template t
        LEFT JOIN landscape.tbl_template_column_config c ON t.template_id = c.template_id
        WHERE t.property_type = ${propertyType.toLowerCase()}
          AND t.is_active = true
        GROUP BY t.template_id, t.template_name, t.property_type, t.template_category, t.description, t.is_active
        ORDER BY t.template_name
      `
    } else {
      templates = await sql<Template[]>`
        SELECT
          t.template_id,
          t.template_name,
          t.property_type,
          t.template_category,
          t.description,
          t.is_active,
          COUNT(c.template_column_id)::int as column_count
        FROM landscape.tbl_property_use_template t
        LEFT JOIN landscape.tbl_template_column_config c ON t.template_id = c.template_id
        WHERE t.is_active = true
        GROUP BY t.template_id, t.template_name, t.property_type, t.template_category, t.description, t.is_active
        ORDER BY t.property_type, t.template_name
      `
    }

    // If include_columns is requested, fetch columns for each template
    if (includeColumns && templates.length > 0) {
      const templateIds = templates.map(t => t.template_id)

      const allColumns = await sql<TemplateColumn & { template_id: number }[]>`
        SELECT
          template_id,
          template_column_id,
          column_name,
          column_label,
          column_type,
          data_type,
          tier,
          display_order,
          is_required,
          data_source_table,
          data_source_value_col,
          data_source_label_col,
          parent_column_name,
          junction_table
        FROM landscape.tbl_template_column_config
        WHERE template_id = ANY(${templateIds})
        ORDER BY template_id, display_order
      `

      // Group columns by template_id
      const columnsByTemplate = allColumns.reduce((acc, col) => {
        const tid = col.template_id
        if (!acc[tid]) acc[tid] = []
        // Remove template_id from the column object
        const { template_id, ...columnData } = col
        acc[tid].push(columnData as TemplateColumn)
        return acc
      }, {} as Record<number, TemplateColumn[]>)

      return NextResponse.json(
        templates.map(t => ({
          ...t,
          columns: columnsByTemplate[t.template_id] || []
        }))
      )
    }

    return NextResponse.json(templates)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        details: message,
      },
      { status: 500 }
    )
  }
}
