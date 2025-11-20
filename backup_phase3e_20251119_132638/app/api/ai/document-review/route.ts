import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { DocumentAnalyzer } from '@/lib/document-analyzer'

interface DocumentReviewSuggestion {
  field_name: string
  field_label: string
  suggested_value: string | number
  confidence: number
  reasoning: string
  current_value?: string | number | null
  source_documents: string[]
}

interface DocumentReviewResponse {
  project_id: number
  review_summary: string
  suggestions: DocumentReviewSuggestion[]
  documents_analyzed: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { project_id } = await request.json()

    if (!project_id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log(`🤖 Starting AI document review for project ${project_id}`)

    // Get project information
    const projectResult = await sql`
      SELECT project_name, location_description, acres_gross, jurisdiction_city, jurisdiction_county, jurisdiction_state
      FROM landscape.tbl_project
      WHERE project_id = ${project_id}
    `

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = projectResult[0]

    // Get document upload history for this project
    const uploadsResult = await sql`
      SELECT package_name, documents, ai_analysis, created_at
      FROM landscape.ai_ingestion_history
      WHERE project_id = ${project_id}
      ORDER BY created_at DESC
    `

    if (uploadsResult.length === 0) {
      return NextResponse.json({
        error: 'No documents found for this project',
        suggestions: []
      }, { status: 404 })
    }

    // For Red Valley project (demo), create mock AI analysis
    if (project_id === 8) {
      const suggestions: DocumentReviewSuggestion[] = [
        {
          field_name: 'project_name',
          field_label: 'Project Name',
          suggested_value: 'Red Valley Master-Planned Community',
          confidence: 0.95,
          reasoning: 'Document consistently refers to "Red Valley" as a master-planned community development',
          current_value: project.project_name,
          source_documents: ['Red Valley Marketing Package', 'Phase 1 Development Plans']
        },
        {
          field_name: 'location_description',
          field_label: 'Location Description',
          suggested_value: 'Southwest corner of Anderson Road and Farrell Road, Maricopa, Arizona',
          confidence: 0.92,
          reasoning: 'Marketing package clearly states location at the corner of Anderson and Farrell Roads in Maricopa, AZ',
          current_value: project.location_description,
          source_documents: ['Red Valley Marketing Package']
        },
        {
          field_name: 'acres_gross',
          field_label: 'Total Acres',
          suggested_value: 160,
          confidence: 0.88,
          reasoning: 'Site plan indicates approximately 160 acres of developable land',
          current_value: project.acres_gross,
          source_documents: ['Phase 1 Development Plans']
        },
        {
          field_name: 'jurisdiction_city',
          field_label: 'City Jurisdiction',
          suggested_value: 'Maricopa',
          confidence: 0.98,
          reasoning: 'Document explicitly states project location within City of Maricopa limits',
          current_value: project.jurisdiction_city,
          source_documents: ['Red Valley Marketing Package']
        },
        {
          field_name: 'jurisdiction_county',
          field_label: 'County Jurisdiction',
          suggested_value: 'Pinal County',
          confidence: 0.96,
          reasoning: 'Maricopa, Arizona is located in Pinal County according to site documentation',
          current_value: project.jurisdiction_county,
          source_documents: ['Red Valley Marketing Package']
        },
        {
          field_name: 'development_type',
          field_label: 'Development Type',
          suggested_value: 'Master-Planned Community',
          confidence: 0.90,
          reasoning: 'Marketing materials describe Red Valley as a comprehensive master-planned community with mixed residential product types',
          current_value: null,
          source_documents: ['Red Valley Marketing Package']
        },
        {
          field_name: 'target_units',
          field_label: 'Target Unit Count',
          suggested_value: 450,
          confidence: 0.75,
          reasoning: 'Site plan suggests capacity for approximately 400-500 residential units based on lot layouts and density',
          current_value: null,
          source_documents: ['Phase 1 Development Plans']
        },
        {
          field_name: 'price_range_low',
          field_label: 'Price Range (Low)',
          suggested_value: 350000,
          confidence: 0.70,
          reasoning: 'Marketing package indicates starting prices in the mid-$300K range for entry-level homes',
          current_value: null,
          source_documents: ['Red Valley Marketing Package']
        },
        {
          field_name: 'price_range_high',
          field_label: 'Price Range (High)',
          suggested_value: 650000,
          confidence: 0.65,
          reasoning: 'Premium lots and larger floor plans suggest upper price points around $650K',
          current_value: null,
          source_documents: ['Red Valley Marketing Package', 'Phase 1 Development Plans']
        }
      ]

      const documentsAnalyzed = uploadsResult.map(upload => upload.package_name)

      const response: DocumentReviewResponse = {
        project_id,
        review_summary: `I analyzed ${uploadsResult.length} document package(s) for Red Valley, including marketing materials, site plans, and project specifications. The documents indicate this is a master-planned community development at the corner of Anderson and Farrell Roads in Maricopa, Arizona, spanning approximately 160 acres with plans for 400-500 residential units.`,
        suggestions,
        documents_analyzed: documentsAnalyzed
      }

      return NextResponse.json(response)
    }

    // For other projects, return basic analysis
    return NextResponse.json({
      project_id,
      review_summary: `Analyzed ${uploadsResult.length} document package(s). AI document analysis is currently in development for this project.`,
      suggestions: [],
      documents_analyzed: uploadsResult.map(upload => upload.package_name)
    })

  } catch (error) {
    console.error('Error in AI document review:', error)
    return NextResponse.json(
      { error: 'Failed to perform document review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { project_id, field_name, user_feedback, current_suggestion, user_proposed_value } = await request.json()

    if (!project_id || !field_name || !user_feedback) {
      return NextResponse.json({ error: 'Project ID, field name, and user feedback are required' }, { status: 400 })
    }

    console.log(`🤖 Re-analyzing field "${field_name}" for project ${project_id} based on user feedback: "${user_feedback}"`)

    // For Red Valley project, use real document analysis
    if (project_id === 8) {
      const analyzer = new DocumentAnalyzer()

      try {
        const result = await analyzer.analyzeDocument({
          project_id,
          field_name,
          user_feedback,
          current_suggestion,
          user_proposed_value
        })

        if (result.success && result.revised_suggestion) {
          // Log the successful re-analysis action
          await sql`
            INSERT INTO landscape.ai_review_history
            (project_id, action_type, field_updates, user_feedback, ai_confidence, created_at)
            VALUES (${project_id}, 'document_reanalysis', ${JSON.stringify([{
              field_name,
              original_value: current_suggestion.suggested_value,
              revised_value: result.revised_suggestion.suggested_value,
              additional_fields_discovered: result.additional_fields?.length || 0,
              document_section: 'Red Valley Phase 1 Email.pdf'
            }])}, ${user_feedback}, ${result.revised_suggestion.confidence}, NOW())
          `

          return NextResponse.json(result)
        } else {
          // Return the AI's request for clarification
          return NextResponse.json(result)
        }

      } catch (error) {
        console.error('Document analysis error:', error)
        return NextResponse.json({
          success: false,
          message: 'Failed to analyze the document. Please try again or provide more specific guidance.',
          ai_question: `I encountered an issue analyzing the document. Could you help me by:
          1. Confirming which document contains the information
          2. Specifying the exact page or section to review
          3. Describing what type of data I should look for`,
          requires_user_clarification: true
        })
      }
    }

    // For other projects, return a generic response
    return NextResponse.json({
      success: false,
      message: 'AI re-analysis not yet available for this project'
    })

  } catch (error) {
    console.error('Error in AI re-analysis:', error)
    return NextResponse.json(
      { error: 'Failed to perform AI re-analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { project_id, field_updates, user_feedback } = await request.json()

    if (!project_id || !field_updates) {
      return NextResponse.json({ error: 'Project ID and field updates are required' }, { status: 400 })
    }

    console.log(`📝 Updating project ${project_id} fields based on AI suggestions`)

    // Start transaction
    await sql`BEGIN`

    try {
      // Update each field in the project table
      for (const update of field_updates) {
        const { field_name, value } = update

        // Map field names to actual database columns
        const fieldMapping: Record<string, string> = {
          'project_name': 'project_name',
          'location_description': 'location_description',
          'acres_gross': 'acres_gross',
          'jurisdiction_city': 'jurisdiction_city',
          'jurisdiction_county': 'jurisdiction_county',
          'jurisdiction_state': 'jurisdiction_state',
          'development_type': 'development_type',
          'target_units': 'target_units',
          'price_range_low': 'price_range_low',
          'price_range_high': 'price_range_high'
        }

        const dbField = fieldMapping[field_name]
        if (!dbField) {
          console.warn(`Unknown field: ${field_name}`)
          continue
        }

        // Update the specific field using dynamic SQL
        if (dbField === 'project_name') {
          await sql`UPDATE landscape.tbl_project SET project_name = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'location_description') {
          await sql`UPDATE landscape.tbl_project SET location_description = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'acres_gross') {
          await sql`UPDATE landscape.tbl_project SET acres_gross = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'jurisdiction_city') {
          await sql`UPDATE landscape.tbl_project SET jurisdiction_city = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'jurisdiction_county') {
          await sql`UPDATE landscape.tbl_project SET jurisdiction_county = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'jurisdiction_state') {
          await sql`UPDATE landscape.tbl_project SET jurisdiction_state = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'development_type') {
          await sql`UPDATE landscape.tbl_project SET development_type = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'target_units') {
          await sql`UPDATE landscape.tbl_project SET target_units = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'price_range_low') {
          await sql`UPDATE landscape.tbl_project SET price_range_low = ${value} WHERE project_id = ${project_id}`
        } else if (dbField === 'price_range_high') {
          await sql`UPDATE landscape.tbl_project SET price_range_high = ${value} WHERE project_id = ${project_id}`
        }

        console.log(`Updated ${field_name} to: ${value}`)
      }

      // Log the AI review action
      await sql`
        INSERT INTO landscape.ai_review_history
        (project_id, action_type, field_updates, user_feedback, created_at)
        VALUES (${project_id}, 'field_update', ${JSON.stringify(field_updates)}, ${user_feedback || null}, NOW())
      `

      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        updated_fields: field_updates.length,
        message: 'Project fields updated successfully'
      })

    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }

  } catch (error) {
    console.error('Error updating project fields:', error)
    return NextResponse.json(
      { error: 'Failed to update project fields', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}