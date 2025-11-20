import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/market-data/land-sales
 *
 * Fetch all land sale comparables for a project.
 */
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
        property_name,
        location,
        sale_date,
        acres,
        price_per_acre,
        total_price
      FROM landscape.market_data_land_sales
      WHERE project_id = ${id}
      ORDER BY sale_date DESC
    `;

    return NextResponse.json({ comparables });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch land sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch land sales', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/market-data/land-sales
 *
 * Create a new land sale comparable.
 */
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
    const { property_name, location, sale_date, acres, price_per_acre, total_price } = body;

    const result = await sql`
      INSERT INTO landscape.market_data_land_sales (
        project_id,
        property_name,
        location,
        sale_date,
        acres,
        price_per_acre,
        total_price
      )
      VALUES (
        ${id},
        ${property_name},
        ${location},
        ${sale_date},
        ${acres},
        ${price_per_acre},
        ${total_price}
      )
      RETURNING comp_id AS id, property_name, location, sale_date, acres, price_per_acre, total_price
    `;

    return NextResponse.json({ success: true, comparable: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create land sale:', error);
    return NextResponse.json(
      { error: 'Failed to create land sale', details: message },
      { status: 500 }
    );
  }
}
