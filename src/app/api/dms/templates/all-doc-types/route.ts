/**
 * GET /api/dms/templates/all-doc-types
 * Returns deduplicated list of all doc_type_options across ALL templates.
 * Used by the Add Type combobox for autocomplete suggestions.
 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT DISTINCT UNNEST(doc_type_options) AS doc_type
      FROM landscape.dms_templates
      WHERE doc_type_options IS NOT NULL
      ORDER BY doc_type
    `;

    const docTypes = rows.map((r) => (r as { doc_type: string }).doc_type);

    return NextResponse.json({
      success: true,
      doc_types: docTypes,
    });
  } catch (error) {
    console.error('Error fetching all template doc types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doc types', doc_types: [] },
      { status: 500 }
    );
  }
}
