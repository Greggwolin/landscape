import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PUT(
  request: Request,
  context: Params
) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id);
    const { code, lot_w_ft, lot_d_ft, linked_type_ids = [] } = await request.json();

    // Validation
    if (!code || !lot_w_ft || !lot_d_ft) {
      return NextResponse.json(
        { error: 'Code, lot width, and lot depth are required' },
        { status: 400 }
      );
    }

    if (lot_w_ft <= 0 || lot_d_ft <= 0) {
      return NextResponse.json(
        { error: 'Lot dimensions must be greater than 0' },
        { status: 400 }
      );
    }

    // Update the product
    const productResult = await sql`
      UPDATE res_lot_product
      SET code = ${code},
          lot_w_ft = ${lot_w_ft},
          lot_d_ft = ${lot_d_ft}
      WHERE product_id = ${productId}
      RETURNING product_id, code, lot_w_ft, lot_d_ft, lot_area_sf
    `;

    if (productResult.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Sync junction table - remove old associations
    await sql`
      DELETE FROM type_lot_product
      WHERE product_id = ${productId}
    `;

    // Add new associations
    if (linked_type_ids.length > 0) {
      for (const typeId of linked_type_ids) {
        await sql`
          INSERT INTO type_lot_product (type_id, product_id)
          VALUES (${typeId}, ${productId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json({
      ...productResult[0],
      linked_type_ids
    });
  } catch (error: any) {
    console.error('Error updating product:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Product code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update product', details: error.message },
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
    const productId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const typeIdParam = searchParams.get('type_id');

    // If a type_id is provided, only unlink the product from that type (do not delete the product record)
    if (typeIdParam) {
      const typeId = parseInt(typeIdParam);
      if (Number.isNaN(typeId)) {
        return NextResponse.json(
          { error: 'Invalid type_id' },
          { status: 400 }
        );
      }

      const unlinkResult = await sql`
        DELETE FROM type_lot_product
        WHERE product_id = ${productId} AND type_id = ${typeId}
        RETURNING type_id
      `;

      if (unlinkResult.length === 0) {
        return NextResponse.json(
          { error: 'Product is not linked to the specified type' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        product_id: productId,
        type_id: typeId,
        unlinked: true
      });
    }

    // Check if any inventory items reference this product
    const inventoryCheck = await sql`
      SELECT COUNT(*) as count
      FROM tbl_inventory_item
      WHERE product_id = ${productId}
    `;

    if (parseInt(inventoryCheck[0].count) > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product referenced by inventory items',
          count: parseInt(inventoryCheck[0].count)
        },
        { status: 422 }
      );
    }

    // Prevent deleting a product that is still linked to any types
    const typeLinks = await sql`
      SELECT COUNT(*) as count
      FROM type_lot_product
      WHERE product_id = ${productId}
    `;

    if (parseInt(typeLinks[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product while it is linked to property types. Remove links first.' },
        { status: 422 }
      );
    }

    // Delete the product
    const result = await sql`
      DELETE FROM res_lot_product
      WHERE product_id = ${productId}
      RETURNING product_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product_id: productId });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error.message },
      { status: 500 }
    );
  }
}
