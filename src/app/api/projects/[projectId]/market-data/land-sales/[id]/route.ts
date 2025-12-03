import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
  id: string;
};

/**
 * PUT /api/projects/[projectId]/market-data/land-sales/[id]
 *
 * Update a land sale comparable.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, id: compId } = await params;
  const projId = Number(projectId);
  const cId = Number(compId);

  if (!Number.isFinite(projId) || !Number.isFinite(cId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { property_name, location, sale_date, acres, price_per_acre, total_price } = body;

    const result = await sql`
      UPDATE landscape.market_data_land_sales
      SET
        property_name = ${property_name},
        location = ${location},
        sale_date = ${sale_date},
        acres = ${acres},
        price_per_acre = ${price_per_acre},
        total_price = ${total_price}
      WHERE project_id = ${projId}
        AND comp_id = ${cId}
      RETURNING comp_id AS id, property_name, location, sale_date, acres, price_per_acre, total_price
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Comparable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comparable: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to update land sale:', error);
    return NextResponse.json(
      { error: 'Failed to update land sale', details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/market-data/land-sales/[id]
 *
 * Delete a land sale comparable.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, id: compId } = await params;
  const projId = Number(projectId);
  const cId = Number(compId);

  if (!Number.isFinite(projId) || !Number.isFinite(cId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await sql`
      DELETE FROM landscape.market_data_land_sales
      WHERE project_id = ${projId}
        AND comp_id = ${cId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete land sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete land sale', details: message },
      { status: 500 }
    );
  }
}
