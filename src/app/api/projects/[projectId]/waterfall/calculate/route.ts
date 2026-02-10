/**
 * GET /api/projects/[projectId]/waterfall/calculate
 *
 * Proxies to the Django/Python waterfall engine. The TypeScript waterfall
 * implementation is deprecated and must not be used for production results.
 */

import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

type Params = { params: Promise<{ projectId: string }> };

/**
 * Transform Django waterfall response to match WaterfallApiResponse interface
 * expected by the WaterfallResults component.
 * @param data - Django response data
 * @param hurdleMethod - The hurdle method from query params ('IRR', 'EMx', or 'IRR_EMx')
 */
function transformDjangoResponse(data: any, hurdleMethod: string | null) {
  // If there's an error, pass it through
  if (data.error) {
    return data;
  }

  const { period_results = [], lp_summary = {}, gp_summary = {}, project_summary = {}, tier_config = [] } = data;

  // Determine display mode based on hurdleMethod query param
  const isEmxMode = hurdleMethod === 'EMx';
  const isIrrEmxMode = hurdleMethod === 'IRR_EMx';

  // Build tier definitions from database config (or use defaults)
  // Determine hurdle type and rate based on the hurdle_method parameter (not just what's in DB)
  const tierDefinitions = tier_config.length > 0
    ? tier_config.map((t: any) => {
        const hasEmx = t.emx_hurdle !== null && t.emx_hurdle !== undefined;
        const hasIrr = t.irr_hurdle !== null && t.irr_hurdle !== undefined;
        let hurdleType: 'IRR' | 'equity_multiple' | null = null;
        let hurdleRate: number | null = null;

        // Use the hurdle_method to determine which value to display
        if (isEmxMode && hasEmx) {
          hurdleType = 'equity_multiple';
          hurdleRate = t.emx_hurdle;
        } else if (isIrrEmxMode) {
          // For IRR+EMx mode, show both values - primary display is IRR
          // but we still need to indicate it's a combined mode
          if (hasIrr) {
            hurdleType = 'IRR';
            hurdleRate = t.irr_hurdle;
          }
        } else if (hasIrr) {
          // Default IRR mode
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

  // Helper to get tier info by number
  const getTier = (n: number) => tierDefinitions.find((t: any) => t.tierNumber === n) || { tierName: `Tier ${n}`, lpSplitPct: 90, gpSplitPct: 10, hurdleRate: null };
  const tierAmounts = [
    { lp: lp_summary.tier1 || 0, gp: gp_summary.tier1 || 0 },
    { lp: lp_summary.tier2 || 0, gp: gp_summary.tier2 || 0 },
    { lp: lp_summary.tier3 || 0, gp: gp_summary.tier3 || 0 },
    { lp: lp_summary.tier4 || 0, gp: gp_summary.tier4 || 0 },
    { lp: lp_summary.tier5 || 0, gp: gp_summary.tier5 || 0 },
  ];

  // Transform period results to periodDistributions
  const periodDistributions = period_results.map((p: any) => ({
    periodId: p.period_id,
    date: p.date,
    cashFlow: p.net_cash_flow,
    cumulativeCashFlow: p.cumulative_cash_flow,
    lpDist: (p.tier1_lp_dist || 0) + (p.tier2_lp_dist || 0) + (p.tier3_lp_dist || 0) + (p.tier4_lp_dist || 0) + (p.tier5_lp_dist || 0),
    gpDist: (p.tier1_gp_dist || 0) + (p.tier2_gp_dist || 0) + (p.tier3_gp_dist || 0) + (p.tier4_gp_dist || 0) + (p.tier5_gp_dist || 0),
    lpIrr: p.lp_irr,
    gpIrr: p.gp_irr,
    // Cumulative accrued returns (compounded interest only, less paid down)
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

  // Build partner summaries with dynamic tier breakdown
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

  // Build tier summaries from database config
  const tierSummaries = tierDefinitions.map((t: any, i: number) => ({
    tierNumber: t.tierNumber,
    tierName: t.tierName,
    lpAmount: tierAmounts[i]?.lp || 0,
    gpAmount: tierAmounts[i]?.gp || 0,
    totalAmount: (tierAmounts[i]?.lp || 0) + (tierAmounts[i]?.gp || 0),
  }));

  // Build project summary with dynamic tier info
  const projectSummary = {
    totalContributed: project_summary.total_equity || 0,
    totalDistributed: project_summary.total_distributed || 0,
    equityMultiple: project_summary.project_emx || 0,
    projectIrr: project_summary.project_irr || undefined,
    tierTotals: tierSummaries.map((t, i) => {
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

function extractJwtFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';').map((p) => p.trim());
  const candidateNames = ['access', 'access_token', 'auth_token'];

  for (const name of candidateNames) {
    const prefix = `${name}=`;
    const match = parts.find((p) => p.startsWith(prefix));
    if (match) {
      const value = match.slice(prefix.length).trim();
      if (value) return value;
    }
  }

  return null;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const id = Number(projectId);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const trace = searchParams.get('trace');
    const hurdleMethod = searchParams.get('hurdle_method');

    const base = DJANGO_API_URL.replace(/\/$/, '');
    const url = new URL(`${base}/api/calculations/project/${id}/waterfall/`);
    if (trace) {
      url.searchParams.set('trace', trace);
    }
    if (hurdleMethod) {
      url.searchParams.set('hurdle_method', hurdleMethod);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    console.log('[waterfall-calc] env check', {
      DJANGO_API_URL,
      hasServiceToken: !!process.env.DJANGO_SERVICE_BEARER_TOKEN,
    });

    // Prefer incoming Authorization header, otherwise derive from cookies or env token
    const incomingAuth = request.headers.get('authorization');
    const cookie = request.headers.get('cookie');
    const serviceToken = process.env.DJANGO_SERVICE_BEARER_TOKEN;

    let jwtFromCookie: string | null = null;
    if (!incomingAuth) {
      jwtFromCookie = extractJwtFromCookie(cookie);
    }

    const authHeaderToUse =
      incomingAuth && incomingAuth.trim().length > 0
        ? incomingAuth
        : jwtFromCookie
        ? `Bearer ${jwtFromCookie}`
        : serviceToken
        ? `Bearer ${serviceToken}`
        : undefined;

    if (authHeaderToUse) {
      headers['Authorization'] = authHeaderToUse;
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const djangoUrl = url.toString();
    console.log('[waterfall-calc] outgoing to Django', {
      url: djangoUrl,
      method: 'POST',
      hasAuthorizationHeader: !!headers['Authorization'],
      hasCookieHeader: !!headers['Cookie'],
      authHeaderPrefix: headers['Authorization']
        ? (headers['Authorization'] as string).split(' ')[0]
        : null,
      usedCookieJwt: !!jwtFromCookie,
      hasServiceToken: !!serviceToken,
    });

    const response = await fetch(djangoUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // keep raw text
      }
      console.log('[waterfall-calc] Django error', {
        status: response.status,
        text,
      });
      console.error(`Django waterfall returned ${response.status}: ${text}`);
      if (parsed?.error) {
        return NextResponse.json(parsed, { status: response.status });
      }
      return NextResponse.json(
        { error: 'Failed to calculate waterfall', details: parsed || text || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform Django response to match WaterfallApiResponse interface
    const transformed = transformDjangoResponse(data, hurdleMethod);
    return NextResponse.json(transformed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to calculate waterfall', error);
    return NextResponse.json(
      { error: 'Failed to calculate waterfall', details: message },
      { status: 500 }
    );
  }
}
