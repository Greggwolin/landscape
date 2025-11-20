import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('family_id');

    console.log('🧪 [TEST API] familyId:', familyId, 'type:', typeof familyId);

    // Test query with family_id filter
    const subtypes = await sql`
      SELECT
        s.subtype_id,
        s.family_id,
        s.name,
        f.name as family_name
      FROM landscape.lu_subtype s
      LEFT JOIN landscape.lu_family f ON f.family_id = s.family_id
      WHERE s.family_id::text = ${familyId}
      ORDER BY s.name
    `;

    console.log('🧪 [TEST API] Results:', subtypes.length, 'items');
    console.log('🧪 [TEST API] Sample results:', subtypes.slice(0, 3));

    return NextResponse.json({
      query_family_id: familyId,
      results_count: subtypes.length,
      subtypes: subtypes
    });
  } catch (error) {
    console.error('🧪 [TEST API] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}