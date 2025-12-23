import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type PropertySubtypeRow = {
  subtype_id: number;
  property_type_code: string;
  subtype_code: string;
  subtype_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

/**
 * GET /api/picklists/property-subtypes?property_type=MF
 * Fetch subtypes filtered by property type
 */
export async function GET(request: NextRequest) {
  try {
    const propertyType = request.nextUrl.searchParams.get('property_type');

    let rows: PropertySubtypeRow[];

    if (propertyType) {
      rows = await sql<PropertySubtypeRow[]>`
        SELECT *
        FROM landscape.lu_property_subtype
        WHERE property_type_code = ${propertyType.toUpperCase()}
          AND is_active = true
        ORDER BY sort_order, subtype_name;
      `;
    } else {
      // Return all subtypes grouped by property type
      rows = await sql<PropertySubtypeRow[]>`
        SELECT *
        FROM landscape.lu_property_subtype
        WHERE is_active = true
        ORDER BY property_type_code, sort_order, subtype_name;
      `;
    }

    return NextResponse.json({
      subtypes: rows.map((row) => ({
        id: row.subtype_id,
        propertyType: row.property_type_code,
        code: row.subtype_code,
        name: row.subtype_name,
        sortOrder: row.sort_order,
      })),
    });
  } catch (err) {
    console.error('property-subtypes GET error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to load property subtypes', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/picklists/property-subtypes
 * Create a new property subtype
 * Body: { property_type_code, subtype_code, subtype_name, sort_order? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { property_type_code, subtype_code, subtype_name, sort_order } = body;

    if (!property_type_code || !subtype_code || !subtype_name) {
      return NextResponse.json(
        { error: 'property_type_code, subtype_code, and subtype_name are required' },
        { status: 400 }
      );
    }

    const code = String(subtype_code).toUpperCase();
    const propertyType = String(property_type_code).toUpperCase();

    // Get next sort order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const maxOrderRow = await sql<{ max_order: number }[]>`
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS max_order
        FROM landscape.lu_property_subtype
        WHERE property_type_code = ${propertyType};
      `;
      finalSortOrder = maxOrderRow[0]?.max_order ?? 1;
    }

    const result = await sql`
      INSERT INTO landscape.lu_property_subtype
        (property_type_code, subtype_code, subtype_name, sort_order)
      VALUES
        (${propertyType}, ${code}, ${subtype_name}, ${finalSortOrder})
      ON CONFLICT (property_type_code, subtype_code) DO UPDATE SET
        subtype_name = EXCLUDED.subtype_name,
        sort_order = EXCLUDED.sort_order
      RETURNING *;
    `;

    return NextResponse.json({ subtype: result[0] }, { status: 201 });
  } catch (err) {
    console.error('property-subtypes POST error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to create property subtype', details: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/picklists/property-subtypes
 * Update a property subtype
 * Body: { subtype_id, subtype_name?, sort_order?, is_active? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtype_id, subtype_name, sort_order, is_active } = body;

    if (!subtype_id) {
      return NextResponse.json({ error: 'subtype_id is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE landscape.lu_property_subtype
      SET
        subtype_name = COALESCE(${subtype_name}, subtype_name),
        sort_order = COALESCE(${sort_order}, sort_order),
        is_active = COALESCE(${is_active}, is_active)
      WHERE subtype_id = ${subtype_id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Subtype not found' }, { status: 404 });
    }

    return NextResponse.json({ subtype: result[0] });
  } catch (err) {
    console.error('property-subtypes PUT error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to update property subtype', details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/picklists/property-subtypes?subtype_id=123
 * Soft-delete (deactivate) a property subtype
 */
export async function DELETE(request: NextRequest) {
  try {
    const subtypeId = request.nextUrl.searchParams.get('subtype_id');

    if (!subtypeId) {
      return NextResponse.json({ error: 'subtype_id is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE landscape.lu_property_subtype
      SET is_active = false
      WHERE subtype_id = ${Number(subtypeId)}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Subtype not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subtype deactivated', subtype: result[0] });
  } catch (err) {
    console.error('property-subtypes DELETE error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to delete property subtype', details: message },
      { status: 500 }
    );
  }
}
