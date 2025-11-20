import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/equity/waterfall
 *
 * Fetch waterfall structure with tiers and splits for a project
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
    // Fetch all tiers for the project
    const tiersResult = await sql`
      SELECT
        id,
        tier_number AS "tierNumber",
        tier_name AS "tierName",
        distribution_type AS "distributionType",
        hurdle_rate AS "hurdleRate",
        notes
      FROM landscape.waterfall_tiers
      WHERE project_id = ${id}
      ORDER BY tier_number ASC
    `;

    // Fetch splits for all tiers
    const splitsResult = await sql`
      SELECT
        ws.tier_id AS "tierId",
        ws.split_percent AS "splitPercent",
        ep.partner_name AS "partnerName"
      FROM landscape.waterfall_splits ws
      JOIN landscape.equity_partners ep ON ws.partner_id = ep.id
      JOIN landscape.waterfall_tiers wt ON ws.tier_id = wt.id
      WHERE wt.project_id = ${id}
      ORDER BY ws.tier_id, ep.partner_name
    `;

    // Combine tiers with their splits
    const tiers = tiersResult.map((tier: any) => ({
      tierNumber: tier.tierNumber,
      tierName: tier.tierName,
      distributionType: tier.distributionType,
      hurdleRate: tier.hurdleRate,
      splits: splitsResult
        .filter((split: any) => split.tierId === tier.id)
        .map((split: any) => ({
          partnerName: split.partnerName,
          percent: split.splitPercent,
        })),
    }));

    return NextResponse.json({ tiers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch waterfall:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waterfall', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/equity/waterfall
 *
 * Create or update waterfall structure for a project
 *
 * Body format:
 * {
 *   tiers: [{
 *     tierNumber: 1,
 *     tierName: "Preferred Return",
 *     distributionType: "preferred",
 *     hurdleRate: 0.08,
 *     splits: [{ partnerId: 1, splitPercent: 100 }]
 *   }]
 * }
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
    const { tiers } = body;

    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Invalid tiers format' }, { status: 400 });
    }

    // Delete existing tiers and splits (cascade will handle splits)
    await sql`
      DELETE FROM landscape.waterfall_tiers
      WHERE project_id = ${id}
    `;

    // Insert new tiers and splits
    for (const tier of tiers) {
      const tierResult = await sql`
        INSERT INTO landscape.waterfall_tiers (
          project_id,
          tier_number,
          tier_name,
          distribution_type,
          hurdle_rate,
          notes
        )
        VALUES (
          ${id},
          ${tier.tierNumber},
          ${tier.tierName},
          ${tier.distributionType},
          ${tier.hurdleRate || null},
          ${tier.notes || null}
        )
        RETURNING id
      `;

      const tierId = tierResult[0].id;

      // Insert splits for this tier
      if (Array.isArray(tier.splits)) {
        for (const split of tier.splits) {
          await sql`
            INSERT INTO landscape.waterfall_splits (
              tier_id,
              partner_id,
              split_percent
            )
            VALUES (
              ${tierId},
              ${split.partnerId},
              ${split.splitPercent}
            )
          `;
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Waterfall structure saved' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to save waterfall:', error);
    return NextResponse.json(
      { error: 'Failed to save waterfall', details: message },
      { status: 500 }
    );
  }
}
