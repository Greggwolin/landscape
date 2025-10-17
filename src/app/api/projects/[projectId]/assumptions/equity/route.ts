import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/projects/:projectId/assumptions/equity
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);

    const result = await sql`
      SELECT * FROM landscape.tbl_equity_structure
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    return NextResponse.json(result.rows[0] || null);

  } catch (error) {
    console.error('Error fetching equity assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equity assumptions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:projectId/assumptions/equity
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);
    const data = await request.json();

    const existing = await sql`
      SELECT equity_structure_id FROM landscape.tbl_equity_structure WHERE project_id = ${projectId}
    `;

    if (existing.rows.length > 0) {
      const result = await sql`
        UPDATE landscape.tbl_equity_structure
        SET
          lp_ownership_pct = ${data.lp_ownership_pct},
          gp_ownership_pct = ${data.gp_ownership_pct},
          preferred_return_pct = ${data.preferred_return_pct},
          gp_promote_after_pref = ${data.gp_promote_after_pref},
          catch_up_pct = ${data.catch_up_pct},
          equity_multiple_target = ${data.equity_multiple_target},
          irr_target_pct = ${data.irr_target_pct},
          distribution_frequency = ${data.distribution_frequency},
          updated_at = NOW()
        WHERE project_id = ${projectId}
        RETURNING *
      `;
      return NextResponse.json(result.rows[0]);
    } else {
      const result = await sql`
        INSERT INTO landscape.tbl_equity_structure (
          project_id, lp_ownership_pct, gp_ownership_pct, preferred_return_pct,
          gp_promote_after_pref, catch_up_pct, equity_multiple_target,
          irr_target_pct, distribution_frequency
        ) VALUES (
          ${projectId}, ${data.lp_ownership_pct}, ${data.gp_ownership_pct},
          ${data.preferred_return_pct}, ${data.gp_promote_after_pref},
          ${data.catch_up_pct}, ${data.equity_multiple_target},
          ${data.irr_target_pct}, ${data.distribution_frequency}
        )
        RETURNING *
      `;
      return NextResponse.json(result.rows[0], { status: 201 });
    }

  } catch (error) {
    console.error('Error saving equity assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save equity assumptions' },
      { status: 500 }
    );
  }
}
