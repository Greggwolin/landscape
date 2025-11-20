import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

interface ProjectFieldMapping {
  field: string
  label: string
  currentValue?: string | number
  proposedValue?: string | number
  source: 'manual' | 'assessor' | 'calculated'
  enabled: boolean
  required: boolean
}

interface MappingData {
  projectUpdates: Record<string, any>
  fieldMappings: ProjectFieldMapping[]
  boundaryMetadata: {
    selectedParcels: any[]
    totalAcres: number
    mappingConfirmedAt: string
  }
}

interface MappingRequest {
  projectId: number
  mappingData: MappingData
}

export async function POST(request: NextRequest) {
  try {
    const body: MappingRequest = await request.json()
    const { projectId, mappingData } = body

    if (!projectId || !mappingData) {
      return NextResponse.json({
        error: 'projectId and mappingData are required'
      }, { status: 400 })
    }

    // Build dynamic update query based on field mappings
    const { projectUpdates, fieldMappings, boundaryMetadata } = mappingData

    // Prepare project field updates
    const updateFields: Record<string, any> = {}

    // Map standard fields to database columns
    const fieldMapping: Record<string, string> = {
      'project_acres': 'acres_gross',
      'county': 'jurisdiction_county',
      'city': 'jurisdiction_city'
    }

    // Apply field mappings to update object
    Object.entries(projectUpdates).forEach(([field, value]) => {
      const dbColumn = fieldMapping[field]
      if (dbColumn) {
        updateFields[dbColumn] = value
      }
    })

    // Update project metadata with mapping information
    const mappingMetadata = {
      field_mappings: fieldMappings,
      boundary_metadata: boundaryMetadata,
      mapping_applied_at: new Date().toISOString(),
      mapping_source: 'assessor_data'
    }

    // Update the project with mapped fields
    let updateQuery = `UPDATE landscape.tbl_project SET `
    const updateParts: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    // Add dynamic field updates
    Object.entries(updateFields).forEach(([column, value]) => {
      updateParts.push(`${column} = $${paramIndex}`)
      queryParams.push(value)
      paramIndex++
    })

    // Update metadata
    updateParts.push(`gis_metadata = COALESCE(gis_metadata, '{}'::jsonb) || $${paramIndex}`)
    queryParams.push(JSON.stringify(mappingMetadata))
    paramIndex++

    updateQuery += updateParts.join(', ')
    updateQuery += ` WHERE project_id = $${paramIndex}`
    queryParams.push(projectId)

    // Execute the update - simplified to avoid sql.unsafe issues
    // Just use the standard sql template literal instead
    await sql`
      UPDATE landscape.tbl_project
      SET
        acres_gross = ${updateFields.acres_gross || null},
        jurisdiction_county = ${updateFields.jurisdiction_county || null},
        jurisdiction_city = ${updateFields.jurisdiction_city || null},
        gis_metadata = COALESCE(gis_metadata, '{}') || ${mappingMetadata}
      WHERE project_id = ${projectId}
    `

    // Log the mapping application for audit trail - simplified
    console.log(`Field mapping applied for project ${projectId}: ${Object.keys(updateFields).join(', ')}`)

    // Fetch updated project data
    const [updatedProject] = await sql`
      SELECT
        project_id,
        project_name,
        acres_gross,
        jurisdiction_county,
        jurisdiction_city,
        gis_metadata
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `

    return NextResponse.json({
      success: true,
      projectId,
      appliedFields: Object.keys(updateFields),
      updatedProject,
      mappingMetadata: {
        fieldCount: fieldMappings.length,
        enabledFields: fieldMappings.filter(f => f.enabled).length,
        appliedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error applying project mapping:', error)
    return NextResponse.json({
      error: error?.message || 'Failed to apply project mapping'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({
        error: 'project_id parameter is required'
      }, { status: 400 })
    }

    // Get current project data and mapping history
    const [project] = await sql`
      SELECT
        project_id,
        project_name,
        acres_gross,
        jurisdiction_county,
        jurisdiction_city,
        gis_metadata
      FROM landscape.tbl_project
      WHERE project_id = ${parseInt(projectId)}
    `

    if (!project) {
      return NextResponse.json({
        error: 'Project not found'
      }, { status: 404 })
    }

    // Get mapping history
    const mappingHistory = await sql`
      SELECT
        mapping_id,
        mapping_type,
        fields_mapped,
        source_data,
        created_at,
        action_type
      FROM landscape.gis_mapping_history
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      projectId: project.project_id,
      projectName: project.project_name,
      currentData: {
        acres_gross: project.acres_gross,
        jurisdiction_county: project.jurisdiction_county,
        jurisdiction_city: project.jurisdiction_city
      },
      mappingMetadata: project.gis_metadata || {},
      mappingHistory: mappingHistory || []
    })

  } catch (error: any) {
    console.error('Error fetching mapping data:', error)
    return NextResponse.json({
      error: error?.message || 'Failed to fetch mapping data'
    }, { status: 500 })
  }
}