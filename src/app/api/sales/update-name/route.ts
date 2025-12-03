import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type UpdateSaleNameRequest = {
  saleDate: string;
  saleName: string;
  projectId?: number;
};

/**
 * POST /api/sales/update-name
 *
 * Updates or creates a user-defined name for a sale transaction.
 * Sale transactions are identified by date (all parcels sold on same date).
 *
 * Request Body:
 *   {
 *     saleDate: "2026-11-14",
 *     saleName: "Retail Portfolio Sale",
 *     projectId?: number (optional, extracted from context if not provided)
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     saleName: "Retail Portfolio Sale"
 *   }
 */
export async function POST(request: Request) {
  try {
    const body: UpdateSaleNameRequest = await request.json();
    const { saleDate, saleName, projectId } = body;

    if (!saleDate || !saleName) {
      return NextResponse.json(
        { error: 'saleDate and saleName are required' },
        { status: 400 }
      );
    }

    // TODO: Get project_id from auth context or require it in request
    // For Phase 3, we'll require it in the request body
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Upsert sale name (insert or update if exists)
    await sql`
      INSERT INTO landscape.sale_names (project_id, sale_date, sale_name, updated_at)
      VALUES (${projectId}, ${saleDate}, ${saleName}, CURRENT_TIMESTAMP)
      ON CONFLICT (project_id, sale_date)
      DO UPDATE SET
        sale_name = ${saleName},
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      success: true,
      saleName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Update sale name API error:', error);
    return NextResponse.json(
      { error: 'Failed to update sale name', details: message },
      { status: 500 }
    );
  }
}
