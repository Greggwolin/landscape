// API endpoint to check subtype table structure and data
import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST() {
  try {
    console.log('Checking subtype table structure...');

    // Check if lu_subtype table exists and show its structure
    const tableInfo = await sql`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'landscape'
      AND table_name = 'lu_subtype'
      ORDER BY ordinal_position
    `;

    console.log('lu_subtype table structure:', tableInfo);

    // Get all subtypes data
    const subtypes = await sql`
      SELECT * FROM landscape.lu_subtype
      ORDER BY family_id, subtype_id
    `;

    console.log('All subtypes:', subtypes);

    // Get subtypes with family names
    const subtypesWithFamily = await sql`
      SELECT
        s.subtype_id,
        s.family_id,
        s.code,
        s.name,
        s.active,
        f.name as family_name
      FROM landscape.lu_subtype s
      LEFT JOIN landscape.lu_family f ON f.family_id = s.family_id
      ORDER BY s.family_id, s.subtype_id
    `;

    return NextResponse.json({
      success: true,
      table_structure: tableInfo,
      total_subtypes: subtypes.length,
      subtypes: subtypes,
      subtypes_with_families: subtypesWithFamily
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error checking subtype table:', error);
    return NextResponse.json({
      error: 'Failed to check subtype table',
      details: message
    }, { status: 500 });
  }
}