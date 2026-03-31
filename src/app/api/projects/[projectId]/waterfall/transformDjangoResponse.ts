/**
 * Transform Django waterfall engine response to the WaterfallApiResponse
 * shape expected by the WaterfallResults frontend component.
 *
 * Shared by both /waterfall/calculate and /waterfall/last-result proxy routes.
 */

export function transformDjangoResponse(data: any, hurdleMethod: string | null) {
  // If there's an error, pass it through
  if (data.error) {
    return data;
  }

  const { period_results = [], lp_summary = {}, gp_summary = {}, project_summary = {}, tier_config = [] } = data;

  // Determine display mode based on hurdleMethod query param
  const isEmxMode = hurdleMethod === 'EMx';
  const isIrrEmxMode = hurdleMethod === 'IRR_EMx';

  // Build tier definitions from database config (or use defaults)
  const tierDefinitions = tier_config.length > 0
    ? tier_config.map((t: any) => {
        const hasEmx = t.emx_hurdle !== null && t.emx_hurdle !== undefined;
        const hasIrr = t.irr_hurdle !== null && t.irr_hurdle !== undefined;
        let hurdleType: 'IRR' | 'equity_multiple' | null = null;
        let hurdleRate: number | null = null;

        if (isEmxMode && hasEmx) {
          hurdleType = 'equity_multiple';
          hurdleRate = t.emx_hurdle;
        } else if (isIrrEmxMode) {
          if (hasIrr) {
            hurdleType = 'IRR';
            hurdleRate = t.irr_hurdle;
          }
        } else if (hasIrr) {
          hurdleType = 'IRR';
          hurdleRate = t.irr_hurdle;
        }

        return {
          tierNumber: t.tier_number,
          tierName: t.tier_name,
          hurdleType,
          hurdleRate,
          emxHurdle: t.emx_hurdle,
          irrHurdle: t.irr_hurdle,
          lpSplitPct: t.lp_split_pct,
          gpSplitPct: t.gp_split_pct,
        };
      })
    : [
        { tierNumber: 1, tierName: 'Return of Capital', hurdleType: null, hurdleRate: null, emxHurdle: null, irrHurdle: null, lpSplitPct: 90, gpSplitPct: 10 },
        { tierNumber: 2, tierName: 'Preferred Return', hurdleType: 'IRR' as const, hurdleRate: 8, emxHurdle: null, irrHurdle: 8, lpSplitPct: 90, gpSplitPct: 10 },
      ];

  const tierAmounts = [
    { lp: lp_summary.tier1 || 0, gp: gp_summary.tier1 || 0 },
    { lp: lp_summary.tier2 || 0, gp: gp_summary.tier2 || 0 },
    { lp: lp_summary.tier3 || 0, gp: gp_summary.tier3 || 0 },
    { lp: lp_summary.tier4 || 0, gp: gp_summary.tier4 || 0 },
    { lp: lp_summary.tier5 || 0, gp: gp_summary.tier5 || 0 },
  ];

  const periodDistributions = period_results.map((p: any) => ({
    periodId: p.period_id,
    date: p.date,
    cashFlow: p.net_cash_flow,
    cumulativeCashFlow: p.cumulative_cash_flow,
    lpDist: (p.tier1_lp_dist || 0) + (p.tier2_lp_dist || 0) + (p.tier3_lp_dist || 0) + (p.tier4_lp_dist || 0) + (p.tier5_lp_dist || 0),
    gpDist: (p.tier1_gp_dist || 0) + (p.tier2_gp_dist || 0) + (p.tier3_gp_dist || 0) + (p.tier4_gp_dist || 0) + (p.tier5_gp_dist || 0),
    lpIrr: p.lp_irr,
    gpIrr: p.gp_irr,
    accruedPref: p.cumulative_accrued_pref || 0,
    accruedHurdle: p.cumulative_accrued_hurdle || 0,
    tiers: tierDefinitions.map((t: any, i: number) => ({
      tierNumber: t.tierNumber,
      tierName: t.tierName,
      lpSplitPct: t.lpSplitPct,
      gpSplitPct: t.gpSplitPct,
      lpShare: p[`tier${i + 1}_lp_dist`] || 0,
      gpShare: p[`tier${i + 1}_gp_dist`] || 0,
    })),
  }));

  const buildTierBreakdown = (amounts: typeof tierAmounts, isLP: boolean) =>
    tierDefinitions.map((t: any, i: number) => ({
      tierNumber: t.tierNumber,
      tierName: t.tierName,
      hurdleRate: t.hurdleRate,
      lpSplitPct: t.lpSplitPct,
      gpSplitPct: t.gpSplitPct,
      amount: isLP ? amounts[i]?.lp || 0 : amounts[i]?.gp || 0,
    }));

  const partnerSummaries = [
    {
      partnerType: 'LP' as const,
      totalContributed: lp_summary.total_contributions || 0,
      totalDistributed: lp_summary.total_distributions || 0,
      irr: lp_summary.irr || 0,
      equityMultiple: lp_summary.equity_multiple || 0,
      tierBreakdown: buildTierBreakdown(tierAmounts, true),
    },
    {
      partnerType: 'GP' as const,
      totalContributed: gp_summary.total_contributions || 0,
      totalDistributed: gp_summary.total_distributions || 0,
      irr: gp_summary.irr || 0,
      equityMultiple: gp_summary.equity_multiple || 0,
      tierBreakdown: buildTierBreakdown(tierAmounts, false),
    },
  ];

  const tierSummaries = tierDefinitions.map((t: any, i: number) => ({
    tierNumber: t.tierNumber,
    tierName: t.tierName,
    lpAmount: tierAmounts[i]?.lp || 0,
    gpAmount: tierAmounts[i]?.gp || 0,
    totalAmount: (tierAmounts[i]?.lp || 0) + (tierAmounts[i]?.gp || 0),
  }));

  const projectSummary = {
    totalContributed: project_summary.total_equity || 0,
    totalDistributed: project_summary.total_distributed || 0,
    equityMultiple: project_summary.project_emx || 0,
    projectIrr: project_summary.project_irr || undefined,
    tierTotals: tierSummaries.map((t: any, i: any) => {
      const tierDef = tierDefinitions[i] || {};
      return {
        tierNumber: t.tierNumber,
        tierName: t.tierName,
        hurdleRate: tierDef.hurdleRate || null,
        lpSplitPct: tierDef.lpSplitPct || 90,
        gpSplitPct: tierDef.gpSplitPct || 10,
        amount: t.totalAmount,
      };
    }),
  };

  return {
    projectSummary,
    partnerSummaries,
    tierSummaries,
    periodDistributions,
    tierDefinitions,
  };
}
