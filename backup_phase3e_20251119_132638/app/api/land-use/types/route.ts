import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('family_id');

    let types;
    if (familyId) {
      // Filter by family
      types = await sql`
        SELECT
          t.type_id,
          t.family_id,
          f.name as family_name,
          t.code,
          t.name,
          t.ord,
          t.active,
          t.notes,
          COUNT(tlp.product_id) as product_count
        FROM landscape.lu_type t
        LEFT JOIN landscape.lu_family f ON t.family_id = f.family_id
        LEFT JOIN landscape.type_lot_product tlp ON t.type_id = tlp.type_id
        WHERE t.family_id = ${familyId} AND t.active = true
        GROUP BY t.type_id, t.family_id, f.name, t.code, t.name, t.ord, t.active, t.notes
        ORDER BY t.ord
      `;
    } else {
      // Return all types
      types = await sql`
        SELECT
          t.type_id,
          t.family_id,
          f.name as family_name,
          t.code,
          t.name,
          t.ord,
          t.active,
          t.notes,
          COUNT(tlp.product_id) as product_count
        FROM landscape.lu_type t
        LEFT JOIN landscape.lu_family f ON t.family_id = f.family_id
        LEFT JOIN landscape.type_lot_product tlp ON t.type_id = tlp.type_id
        WHERE t.active = true
        GROUP BY t.type_id, t.family_id, f.name, t.code, t.name, t.ord, t.active, t.notes
        ORDER BY t.ord
      `;
    }

    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching land use types:', error);
    return NextResponse.json({ error: 'Failed to fetch types' }, { status: 500 });
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

    if (name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Verify family exists
    const familyCheck = await sql`
      SELECT family_id FROM landscape.lu_family WHERE family_id = ${family_id}
    `;

    if (familyCheck.length === 0) {
      return NextResponse.json(
        { error: 'Family does not exist' },
        { status: 400 }
      );
    }

    // Insert new type
    const result = await sql`
      INSERT INTO landscape.lu_type (family_id, code, name, ord, notes)
      VALUES (${family_id}, ${code.toUpperCase()}, ${name}, ${ord}, ${notes})
      RETURNING type_id, family_id, code, name, ord, active, notes
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating type:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: `Type code already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create type', details: error.message },
      { status: 500 }
    );
  }
}
