import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

type NapkinPayload = {
  lpCapital: number;
  gpCapital: number;
  prefRate: number;
  promotePct: number;
  hurdleIrr: number;
  residualGpPct: number;
  // Extended fields for new UI structure
  waterfallType?: 'IRR' | 'EM' | 'IRR_EM';
  prefLpPct?: number;
  promoteLpPct?: number;
  residualLpPct?: number;
  prefRateEm?: number;
  hurdleEm?: number;
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { projectId } = await params;
    const id = Number(projectId);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body: NapkinPayload = await request.json();
    const {
      lpCapital,
      gpCapital,
      prefRate,
      promotePct,
      hurdleIrr,
      residualGpPct,
      // Extended fields
      waterfallType = 'IRR',
      prefLpPct,
      promoteLpPct,
      residualLpPct,
      prefRateEm,
      hurdleEm,
    } = body;

    if (
      [lpCapital, gpCapital, prefRate, promotePct, hurdleIrr, residualGpPct].some(
        (v) => v === undefined || v === null || Number.isNaN(Number(v))
      )
    ) {
      return NextResponse.json(
        { error: 'All six inputs are required' },
        { status: 400 }
      );
    }

    const totalEquity = Number(lpCapital) + Number(gpCapital);
    if (totalEquity <= 0) {
      return NextResponse.json(
        { error: 'Total equity must be greater than zero' },
        { status: 400 }
      );
    }

    const lpPct = totalEquity > 0 ? Number(lpCapital) / totalEquity : 0;
    const gpPct = totalEquity > 0 ? Number(gpCapital) / totalEquity : 0;

    // Use explicit split percentages if provided, otherwise calculate from ownership + promote
    const tier1LpSplit = prefLpPct !== undefined ? Number(prefLpPct) : lpPct * 100;
    const tier1GpSplit = 100 - tier1LpSplit;

    const tier2LpSplit = promoteLpPct !== undefined ? Number(promoteLpPct) : (1 - (1 - lpPct) - lpPct * Number(promotePct) / 100) * 100;
    const tier2GpSplit = 100 - tier2LpSplit;

    const tier3LpSplit = residualLpPct !== undefined ? Number(residualLpPct) : (100 - Number(residualGpPct));
    const tier3GpSplit = 100 - tier3LpSplit;

    const equityStructureId = await ensureEquityStructure(id, lpPct, gpPct, prefRate);

    const lpPartner = await upsertEquityPartner({
      projectId: id,
      partnerName: 'LP',
      partnerType: 'LP',
      equityClass: 'Limited Partner',
      commitmentAmount: Number(lpCapital),
      fundedAmount: Number(lpCapital),
      ownershipPct: lpPct * 100,
      preferredReturnPct: Number(prefRate),
      promotePct: null,
      capitalContributed: Number(lpCapital),
    });

    const gpPartner = await upsertEquityPartner({
      projectId: id,
      partnerName: 'GP',
      partnerType: 'GP',
      equityClass: 'General Partner',
      commitmentAmount: Number(gpCapital),
      fundedAmount: Number(gpCapital),
      ownershipPct: gpPct * 100,
      preferredReturnPct: Number(prefRate),
      promotePct: Number(promotePct),
      capitalContributed: Number(gpCapital),
    });

    await sql`
      DELETE FROM landscape.tbl_waterfall_tier
      WHERE project_id = ${id}
    `;

    const waterfallTiers = [];

    // Determine hurdle type based on waterfall type selection
    // Map to database enum values: 'irr', 'equity_multiple', 'cumulative_cash', 'hybrid'
    const useIrr = waterfallType === 'IRR' || waterfallType === 'IRR_EM';
    const useEm = waterfallType === 'EM' || waterfallType === 'IRR_EM';
    const hurdleTypeStr = waterfallType === 'IRR_EM' ? 'hybrid' : waterfallType === 'EM' ? 'equity_multiple' : 'irr';

    // Always save BOTH IRR and EMx thresholds regardless of current mode selection.
    // This allows seamless switching between modes without losing data.
    // The hurdle_type just indicates the user's current UI preference.

    // IRR defaults: Tier 1 = 8% (pref), Tier 2 = 15% (hurdle)
    const tier1IrrThreshold = prefRate !== undefined && prefRate !== null ? prefRate : 8;
    const tier2IrrThreshold = hurdleIrr !== undefined && hurdleIrr !== null ? hurdleIrr : 15;

    // EMx defaults: Tier 1 = 1.0x (return capital), Tier 2 = 1.5x (hurdle)
    const tier1EmxThreshold = prefRateEm !== undefined && prefRateEm !== null ? prefRateEm : 1.0;
    const tier2EmxThreshold = hurdleEm !== undefined && hurdleEm !== null ? hurdleEm : 1.5;

    // Tier 1: Preferred Return + Capital
    const tier1 = await sql`
      INSERT INTO landscape.tbl_waterfall_tier (
        project_id,
        equity_structure_id,
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
        is_active,
        display_order
      ) VALUES (
        ${id},
        ${equityStructureId},
        ${1},
        ${'Preferred Return + Capital'},
        ${`${prefRate}% pref return, then return of capital`},
        ${hurdleTypeStr},
        ${tier1IrrThreshold},
        ${tier1IrrThreshold},
        ${tier1EmxThreshold},
        ${tier1LpSplit},
        ${tier1GpSplit},
        ${true},
        ${true},
        ${1}
      )
      RETURNING *
    `;
    waterfallTiers.push(tier1[0]);

    // Tier 2: Hurdle / Promote
    const tier2 = await sql`
      INSERT INTO landscape.tbl_waterfall_tier (
        project_id,
        equity_structure_id,
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
        is_active,
        display_order
      ) VALUES (
        ${id},
        ${equityStructureId},
        ${2},
        ${'Hurdle 1'},
        ${`${promotePct}% promote until LP achieves ${hurdleIrr}% IRR`},
        ${hurdleTypeStr},
        ${tier2IrrThreshold},
        ${tier2IrrThreshold},
        ${tier2EmxThreshold},
        ${tier2LpSplit},
        ${tier2GpSplit},
        ${false},
        ${true},
        ${2}
      )
      RETURNING *
    `;
    waterfallTiers.push(tier2[0]);

    // Tier 3: Residual
    const tier3 = await sql`
      INSERT INTO landscape.tbl_waterfall_tier (
        project_id,
        equity_structure_id,
        tier_number,
        tier_name,
        tier_description,
        hurdle_type,
        hurdle_rate,
        lp_split_pct,
        gp_split_pct,
        is_pari_passu,
        is_active,
        display_order
      ) VALUES (
        ${id},
        ${equityStructureId},
        ${3},
        ${'Residual'},
        ${`Residual split after hurdle`},
        ${null},
        ${null},
        ${tier3LpSplit},
        ${tier3GpSplit},
        ${false},
        ${true},
        ${3}
      )
      RETURNING *
    `;
    waterfallTiers.push(tier3[0]);

    return NextResponse.json({
      success: true,
      equityPartners: [lpPartner, gpPartner],
      waterfallTiers,
      waterfallType,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to save Napkin waterfall', error);
    return NextResponse.json(
      { error: 'Failed to save Napkin waterfall', details: message },
      { status: 500 }
    );
  }
}

async function ensureEquityStructure(
  projectId: number,
  lpPct: number,
  gpPct: number,
  prefRate: number
): Promise<number | null> {
  const existing = await sql`
    SELECT equity_structure_id
    FROM landscape.tbl_equity_structure
    WHERE project_id = ${projectId}
    LIMIT 1
  `;

  if (existing.length > 0) {
    // Update existing structure
    await sql`
      UPDATE landscape.tbl_equity_structure
      SET
        lp_ownership_pct = ${lpPct * 100},
        gp_ownership_pct = ${gpPct * 100},
        preferred_return_pct = ${prefRate},
        updated_at = NOW()
      WHERE equity_structure_id = ${existing[0].equity_structure_id}
    `;
    return Number(existing[0].equity_structure_id);
  }

  const created = await sql`
    INSERT INTO landscape.tbl_equity_structure (
      project_id,
      lp_ownership_pct,
      gp_ownership_pct,
      preferred_return_pct
    ) VALUES (
      ${projectId},
      ${lpPct * 100},
      ${gpPct * 100},
      ${prefRate}
    )
    RETURNING equity_structure_id
  `;

  return created.length > 0 ? Number(created[0].equity_structure_id) : null;
}

async function upsertEquityPartner(partner: {
  projectId: number;
  partnerName: string;
  partnerType: string;
  equityClass: string;
  commitmentAmount: number;
  fundedAmount: number;
  ownershipPct: number;
  preferredReturnPct: number;
  promotePct: number | null;
  capitalContributed: number;
}) {
  const existing = await sql`
    SELECT equity_id
    FROM landscape.tbl_equity
    WHERE project_id = ${partner.projectId}
      AND partner_name = ${partner.partnerName}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const updated = await sql`
      UPDATE landscape.tbl_equity
      SET
        equity_name = ${partner.partnerName},
        partner_type = ${partner.partnerType},
        equity_class = ${partner.equityClass},
        commitment_amount = ${partner.commitmentAmount},
        funded_amount = ${partner.fundedAmount},
        ownership_pct = ${partner.ownershipPct},
        preferred_return_pct = ${partner.preferredReturnPct},
        promote_pct = ${partner.promotePct},
        capital_contributed = ${partner.capitalContributed},
        unreturned_capital = ${partner.capitalContributed},
        updated_at = NOW()
      WHERE equity_id = ${existing[0].equity_id}
      RETURNING *
    `;
    return updated[0];
  }

  const created = await sql`
    INSERT INTO landscape.tbl_equity (
      project_id,
      equity_name,
      partner_name,
      partner_type,
      equity_class,
      commitment_amount,
      funded_amount,
      ownership_pct,
      preferred_return_pct,
      promote_pct,
      capital_contributed,
      unreturned_capital
    ) VALUES (
      ${partner.projectId},
      ${partner.partnerName},
      ${partner.partnerName},
      ${partner.partnerType},
      ${partner.equityClass},
      ${partner.commitmentAmount},
      ${partner.fundedAmount},
      ${partner.ownershipPct},
      ${partner.preferredReturnPct},
      ${partner.promotePct},
      ${partner.capitalContributed},
      ${partner.capitalContributed}
    )
    RETURNING *
  `;
  return created[0];
}
