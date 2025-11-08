import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const families = await sql`
      SELECT
        f.family_id,
        f.code,
        f.name,
        f.active,
        f.notes,
        COUNT(DISTINCT t.type_id) as type_count,
        COUNT(DISTINCT tlp.product_id) as product_count
      FROM lu_family f
      LEFT JOIN lu_type t ON t.family_id = f.family_id AND t.active = true
      LEFT JOIN type_lot_product tlp ON tlp.type_id = t.type_id
      WHERE f.active = true
      GROUP BY f.family_id, f.code, f.name, f.active, f.notes
      ORDER BY
        CASE f.code
          WHEN 'RES' THEN 1
          WHEN 'COM' THEN 2
          WHEN 'IND' THEN 3
          ELSE 4
        END, f.name
    `;

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
    return NextResponse.json(
      { error: 'Failed to fetch families' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { code, name, notes = null } = await request.json();

    // Validation
    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      );
    }

    if (code.length < 2 || code.length > 10) {
      return NextResponse.json(
        { error: 'Code must be between 2 and 10 characters' },
        { status: 400 }
      );
    }

    // Insert new family
    const result = await sql`
      INSERT INTO lu_family (code, name, notes)
      VALUES (${code.toUpperCase()}, ${name}, ${notes})
      RETURNING family_id, code, name, active, notes
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating family:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Family code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create family', details: error.message },
      { status: 500 }
    );
  }
}
