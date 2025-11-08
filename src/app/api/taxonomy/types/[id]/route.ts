import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PUT(
  request: Request,
  context: Params
) {
  try {
    const { id } = await context.params;
    const typeId = parseInt(id);
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

    // Update type
    const result = await sql`
      UPDATE lu_type
      SET family_id = ${family_id},
          code = ${code.toUpperCase()},
          name = ${name},
          ord = ${ord},
          notes = ${notes}
      WHERE type_id = ${typeId}
      RETURNING type_id, family_id, code, name, ord, active, notes
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating type:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Type code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update type', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: Params
) {
  try {
    const { id } = await context.params;
    const typeId = parseInt(id);

    // Check for products linked via junction table
    const productCheck = await sql`
      SELECT COUNT(*) as count
      FROM type_lot_product
      WHERE type_id = ${typeId}
    `;

    if (parseInt(productCheck[0].count) > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete type with linked products',
          count: parseInt(productCheck[0].count)
        },
        { status: 422 }
      );
    }

    // Soft delete (set active = false)
    const result = await sql`
      UPDATE lu_type
      SET active = false
      WHERE type_id = ${typeId}
      RETURNING type_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, type_id: typeId });
  } catch (error: any) {
    console.error('Error deleting type:', error);
    return NextResponse.json(
      { error: 'Failed to delete type', details: error.message },
      { status: 500 }
    );
  }
}
