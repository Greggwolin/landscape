import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string; productId: string }> };

// DELETE - Unlink a product from a type
export async function DELETE(
  request: Request,
  context: Params
) {
  try {
    const { id, productId: productIdParam } = await context.params;
    const typeId = parseInt(id);
    const productId = parseInt(productIdParam);

    const result = await sql`
      DELETE FROM landscape.type_lot_product
      WHERE type_id = ${typeId} AND product_id = ${productId}
      RETURNING type_id, product_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      type_id: typeId,
      product_id: productId
    });
  } catch (error: any) {
    console.error('Error unlinking product from type:', error);
    return NextResponse.json(
      { error: 'Failed to unlink product', details: error.message },
      { status: 500 }
    );
  }
}
