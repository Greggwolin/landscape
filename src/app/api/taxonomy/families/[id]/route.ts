import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PUT(
  request: Request,
  context: Params
) {
  try {
    const { id } = await context.params;
    const familyId = parseInt(id);
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

    // Update family
    const result = await sql`
      UPDATE lu_family
      SET code = ${code.toUpperCase()},
          name = ${name},
          notes = ${notes}
      WHERE family_id = ${familyId}
      RETURNING family_id, code, name, active, notes
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating family:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Family code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update family', details: error.message },
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
    const familyId = parseInt(id);

    // Check for active types referencing this family
    const typeCheck = await sql`
      SELECT COUNT(*) as count
      FROM lu_type
      WHERE family_id = ${familyId} AND active = true
    `;

    if (parseInt(typeCheck[0].count) > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete family with active types',
          count: parseInt(typeCheck[0].count)
        },
        { status: 422 }
      );
    }

    // Soft delete (set active = false)
    const result = await sql`
      UPDATE lu_family
      SET active = false
      WHERE family_id = ${familyId}
      RETURNING family_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, family_id: familyId });
  } catch (error: any) {
    console.error('Error deleting family:', error);
    return NextResponse.json(
      { error: 'Failed to delete family', details: error.message },
      { status: 500 }
    );
  }
}
