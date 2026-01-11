import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { projectId } = await params;
    const id = Number(projectId);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const [tiers, equityPartners] = await Promise.all([
      sql`
        SELECT
          tier_id,
          project_id,
          tier_number,
          tier_name,
          tier_description,
          hurdle_type,
          hurdle_rate,
          irr_threshold_pct,
          equity_multiple_threshold,
          lp_split_pct,
          gp_split_pct,
          is_pari_passu,
          is_lookback_tier,
          display_order,
          is_active,
          created_at,
          updated_at
        FROM landscape.tbl_waterfall_tier
        WHERE project_id = ${id}
        ORDER BY COALESCE(display_order, tier_number) ASC
      `,
      sql`
        SELECT
          equity_id,
          project_id,
          partner_name,
          partner_type,
          equity_class,
          ownership_pct,
          capital_contributed,
          commitment_amount,
          preferred_return_pct,
          promote_pct
        FROM landscape.tbl_equity
        WHERE project_id = ${id}
        ORDER BY partner_type DESC, partner_name ASC
      `,
    ]);

    return NextResponse.json({
      success: true,
      equityPartners: equityPartners.map((p: any) => ({
        equityId: Number(p.equity_id),
        projectId: Number(p.project_id),
        partnerName: p.partner_name,
        partnerType: p.partner_type,
        equityClass: p.equity_class,
        ownershipPct: p.ownership_pct !== null ? Number(p.ownership_pct) : null,
        capitalContributed: p.capital_contributed !== null
          ? Number(p.capital_contributed)
          : Number(p.commitment_amount || 0),
        preferredReturnPct: p.preferred_return_pct !== null ? Number(p.preferred_return_pct) : null,
        promotePct: p.promote_pct !== null ? Number(p.promote_pct) : null,
      })),
      waterfallTiers: tiers.map((t: any) => ({
        tierId: Number(t.tier_id),
        projectId: Number(t.project_id),
        tierNumber: Number(t.tier_number),
        tierName: t.tier_name || t.tier_description,
        tierDescription: t.tier_description,
        hurdleType: t.hurdle_type,
        hurdleRate: t.hurdle_rate !== null ? Number(t.hurdle_rate) : t.irr_threshold_pct !== null ? Number(t.irr_threshold_pct) : null,
        equityMultipleThreshold: t.equity_multiple_threshold !== null ? Number(t.equity_multiple_threshold) : null,
        lpSplitPct: Number(t.lp_split_pct || 0),
        gpSplitPct: Number(t.gp_split_pct || 0),
        isPariPassu: Boolean(t.is_pari_passu),
        isLookbackTier: Boolean(t.is_lookback_tier),
        isActive: t.is_active !== null ? Boolean(t.is_active) : true,
        displayOrder: t.display_order !== null ? Number(t.display_order) : Number(t.tier_number),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch waterfall', error);
    return NextResponse.json(
      { error: 'Failed to fetch waterfall', details: message },
      { status: 500 }
    );
  }
}
