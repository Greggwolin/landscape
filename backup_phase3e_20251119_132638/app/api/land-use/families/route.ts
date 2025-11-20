import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const families = await sql`
      SELECT
        f.family_id,
        f.code,
        f.name,
        f.active,
        f.notes,
        COUNT(t.type_id) FILTER (WHERE t.active = true) as type_count
      FROM landscape.lu_family f
      LEFT JOIN landscape.lu_type t ON f.family_id = t.family_id
      WHERE f.active = true
      GROUP BY f.family_id, f.code, f.name, f.active, f.notes
      ORDER BY f.code
    `;

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching land use families:', error);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
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

    if (name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Insert new family
    const result = await sql`
      INSERT INTO landscape.lu_family (code, name, notes)
      VALUES (${code.toUpperCase()}, ${name}, ${notes})
      RETURNING family_id, code, name, active, notes
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating family:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: `Family code '${(await request.json()).code}' already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create family', details: error.message },
      { status: 500 }
    );
  }
}
