import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get('family_id');

  if (!familyId) {
    return NextResponse.json(
      { error: 'family_id parameter required' },
      { status: 400 }
    );
  }

  try {
    const types = await sql`
      SELECT
        t.type_id,
        t.code,
        t.name,
        t.family_id,
        t.active,
        COUNT(DISTINCT tlp.product_id) as product_count
      FROM lu_type t
      LEFT JOIN type_lot_product tlp ON tlp.type_id = t.type_id
      WHERE t.active = true
        AND t.family_id = ${familyId}
      GROUP BY t.type_id, t.code, t.name, t.family_id, t.active
      ORDER BY t.name
    `;

    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch types' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { family_id, code, name, ord = null, notes = null } = await request.json();

    // Validation
    if (!family_id || !code || !name) {
      return NextResponse.json(
        { error: 'Family ID, code, and name are required' },
        { status: 400 }
      );
    }

    if (code.length < 2 || code.length > 20) {
      return NextResponse.json(
        { error: 'Code must be between 2 and 20 characters' },
        { status: 400 }
      );
    }

    // Verify family exists
    const familyCheck = await sql`
      SELECT family_id FROM lu_family WHERE family_id = ${family_id}
    `;

    if (familyCheck.length === 0) {
      return NextResponse.json(
        { error: 'Family does not exist' },
        { status: 400 }
      );
    }

    // Insert new type
    const result = await sql`
      INSERT INTO lu_type (family_id, code, name, ord, notes)
      VALUES (${family_id}, ${code.toUpperCase()}, ${name}, ${ord}, ${notes})
      RETURNING type_id, family_id, code, name, ord, active, notes
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating type:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Type code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create type', details: error.message },
      { status: 500 }
    );
  }
}
