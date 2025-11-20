import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const comparables = await sql<any[]>`
      SELECT
        comp_id AS id,
        project_name,
        location,
        product_type,
        avg_price,
        price_per_sf,
        date_reported
      FROM landscape.market_data_housing_prices
      WHERE project_id = ${id}
      ORDER BY date_reported DESC
    `;

    return NextResponse.json({ comparables });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch housing prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch housing prices', details: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { project_name, location, product_type, avg_price, price_per_sf, date_reported } = body;

    const result = await sql`
      INSERT INTO landscape.market_data_housing_prices (
        project_id,
        project_name,
        location,
        product_type,
        avg_price,
        price_per_sf,
        date_reported
      )
      VALUES (
        ${id},
        ${project_name},
        ${location},
        ${product_type},
        ${avg_price},
        ${price_per_sf},
        ${date_reported}
      )
      RETURNING comp_id AS id, project_name, location, product_type, avg_price, price_per_sf, date_reported
    `;

    return NextResponse.json({ success: true, comparable: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create housing price:', error);
    return NextResponse.json(
      { error: 'Failed to create housing price', details: message },
      { status: 500 }
    );
  }
}
