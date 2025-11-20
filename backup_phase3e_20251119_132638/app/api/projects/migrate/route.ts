import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    console.log('Adding jurisdiction columns to tbl_project...')
    
    // Check if columns already exist
    const existingColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'landscape' 
        AND table_name = 'tbl_project'
        AND column_name IN ('jurisdiction_city', 'jurisdiction_county', 'jurisdiction_state')
    `
    
    const existingColumnNames = existingColumns.map(col => col.column_name)
    
    // Add missing jurisdiction columns
    if (!existingColumnNames.includes('jurisdiction_city')) {
      await sql`ALTER TABLE landscape.tbl_project ADD COLUMN jurisdiction_city VARCHAR(100)`
      console.log('Added jurisdiction_city column')
    }
    
    if (!existingColumnNames.includes('jurisdiction_county')) {
      await sql`ALTER TABLE landscape.tbl_project ADD COLUMN jurisdiction_county VARCHAR(100)`
      console.log('Added jurisdiction_county column')
    }
    
    if (!existingColumnNames.includes('jurisdiction_state')) {
      await sql`ALTER TABLE landscape.tbl_project ADD COLUMN jurisdiction_state VARCHAR(10)`
      console.log('Added jurisdiction_state column')
    }
    
    // Update Project #7 with Peoria jurisdiction
    const updateResult = await sql`
      UPDATE landscape.tbl_project 
      SET jurisdiction_city = 'Peoria',
          jurisdiction_county = 'Maricopa County',
          jurisdiction_state = 'AZ'
      WHERE project_id = 7
      RETURNING *
    `
    
    return NextResponse.json({
      success: true,
      message: 'Jurisdiction columns added and Project #7 updated',
      columnsAdded: 3 - existingColumnNames.length,
      project: updateResult[0] || null
    })
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: message 
    }, { status: 500 })
  }
}