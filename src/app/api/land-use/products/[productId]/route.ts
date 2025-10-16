import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface Params {
  productId: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    const { productId } = await context.params;

    const product = await sql`
      SELECT
        product_id,
        code,
        lot_w_ft,
        lot_d_ft,
        lot_area_sf
      FROM landscape.res_lot_product
      WHERE product_id = ${productId}
    `;

    if (product.length === 0) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    return Response.json(product[0]);
  } catch (error) {
    console.error('Error fetching product details:', error);
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
