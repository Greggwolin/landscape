import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const result = await sql`
      SELECT
        product_id,
        code as product_code,
        code as product_name,
        lot_w_ft as lot_width,
        lot_d_ft as lot_depth,
        lot_area_sf
      FROM landscape.res_lot_product
      ORDER BY code
    `;

    return NextResponse.json(result || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Res lot products API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch residential lot products',
      details: message
    }, { status: 500 });
  }
}