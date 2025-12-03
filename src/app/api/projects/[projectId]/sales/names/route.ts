import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/:projectId/sales/names
 *
 * Returns all user-defined sale names for a project.
 *
 * Response:
 *   {
 *     saleNames: {
 *       "2026-11-14": "Retail Portfolio Sale",
 *       "2027-09-15": "Phase 1 Bulk Sale"
 *     }
 *   }
 */
export async function GET(
  request: Request,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Fetch all sale names for this project
    const results = await sql`
      SELECT sale_date, sale_name
      FROM landscape.sale_names
      WHERE project_id = ${projectId}
      ORDER BY sale_date
    `;

    // Convert array to object mapping date -> name
    const saleNames = results.reduce((acc: Record<string, string>, row: any) => {
      // Format date as YYYY-MM-DD for consistency
      const dateStr = row.sale_date instanceof Date
        ? row.sale_date.toISOString().split('T')[0]
        : row.sale_date;
      acc[dateStr] = row.sale_name;
      return acc;
    }, {});

    return NextResponse.json({ saleNames });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Get sale names API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale names', details: message },
      { status: 500 }
    );
  }
}
