import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
  id: string;
};

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
    const { project_name, location, product_type, avg_price, price_per_sf, date_reported } = body;

    const result = await sql`
      UPDATE landscape.market_data_housing_prices
      SET
        project_name = ${project_name},
        location = ${location},
        product_type = ${product_type},
        avg_price = ${avg_price},
        price_per_sf = ${price_per_sf},
        date_reported = ${date_reported}
      WHERE project_id = ${projId}
        AND comp_id = ${cId}
      RETURNING comp_id AS id, project_name, location, product_type, avg_price, price_per_sf, date_reported
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Comparable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comparable: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to update housing price:', error);
    return NextResponse.json(
      { error: 'Failed to update housing price', details: message },
      { status: 500 }
    );
  }
}

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
      DELETE FROM landscape.market_data_housing_prices
      WHERE project_id = ${projId}
        AND comp_id = ${cId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete housing price:', error);
    return NextResponse.json(
      { error: 'Failed to delete housing price', details: message },
      { status: 500 }
    );
  }
}
