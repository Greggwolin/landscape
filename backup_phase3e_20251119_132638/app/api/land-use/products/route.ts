import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('type_id');

    let products;
    if (typeId) {
      // Filter products by type (via junction table)
      products = await sql`
        SELECT
          p.product_id as value,
          p.code as label,
          p.code,
          p.lot_w_ft,
          p.lot_d_ft,
          p.lot_area_sf
        FROM landscape.res_lot_product p
        JOIN landscape.type_lot_product tp ON p.product_id = tp.product_id
        WHERE tp.type_id = ${typeId}
        ORDER BY p.code
      `;
    } else {
      // Return all products
      products = await sql`
        SELECT
          product_id as value,
          code as label,
          code,
          lot_w_ft,
          lot_d_ft,
          lot_area_sf
        FROM landscape.res_lot_product
        ORDER BY code
      `;
    }

    return Response.json(products);
  } catch (error) {
    console.error('Error fetching residential products:', error);
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
