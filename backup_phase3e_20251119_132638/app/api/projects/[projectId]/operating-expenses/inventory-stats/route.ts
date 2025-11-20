import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const sql = neon(process.env.DATABASE_URL!);

interface InventoryStats {
  unsold_parcels: number;
  total_parcels: number;
  unsold_acres: number;
  total_acres: number;
  pct_unsold: number;
}

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  _request: Request,
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

    const stats = await sql<InventoryStats[]>`
      WITH parcel_status AS (
        SELECT
          p.parcel_id,
          p.acres_gross,
          COALESCE(closing_dates.closing_date, NULL) AS closing_date
        FROM landscape.tbl_parcel p
        LEFT JOIN LATERAL (
          SELECT MIN(ce.closing_date) AS closing_date
          FROM landscape.tbl_parcel_sale_event pse
          JOIN landscape.tbl_closing_event ce
            ON ce.sale_event_id = pse.sale_event_id
          WHERE pse.parcel_id = p.parcel_id
        ) closing_dates ON TRUE
        WHERE p.project_id = ${projectId}
      )
      SELECT
        COUNT(*) FILTER (
          WHERE closing_date IS NULL OR closing_date > CURRENT_DATE
        ) AS unsold_parcels,
        COUNT(*) AS total_parcels,
        COALESCE(SUM(acres_gross) FILTER (
          WHERE closing_date IS NULL OR closing_date > CURRENT_DATE
        ), 0) AS unsold_acres,
        COALESCE(SUM(acres_gross), 0) AS total_acres,
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (
              COUNT(*) FILTER (
                WHERE closing_date IS NULL OR closing_date > CURRENT_DATE
              )::NUMERIC / COUNT(*)::NUMERIC
            ) * 100, 2
          )
        END AS pct_unsold
      FROM parcel_status;
    `;

    return NextResponse.json(stats[0] || {
      unsold_parcels: 0,
      total_parcels: 0,
      unsold_acres: 0,
      total_acres: 0,
      pct_unsold: 0
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
