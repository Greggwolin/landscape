/**
 * GET /api/projects/[projectId]/waterfall/last-result
 *
 * Proxies to Django to fetch the last persisted waterfall result
 * (no recalculation). Transforms from Django engine format to
 * WaterfallApiResponse shape expected by the frontend.
 * Returns 404 if no result has been persisted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformDjangoResponse } from '../transformDjangoResponse';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8001';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { projectId } = await params;
  const djangoUrl = `${DJANGO_API_URL}/api/calculations/project/${projectId}/waterfall/last-result/`;

  try {
    const djangoRes = await fetch(djangoUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!djangoRes.ok) {
      const json = await djangoRes.json().catch(() => ({ error: 'No persisted result' }));
      return NextResponse.json(json, { status: djangoRes.status });
    }

    const raw = await djangoRes.json();

    // The persisted result is in Django engine format (period_results, lp_summary, etc.)
    // Transform it to WaterfallApiResponse shape (periodDistributions, tierDefinitions, etc.)
    // Default to IRR mode for persisted results (the hurdle_method isn't stored with the result)
    const transformed = transformDjangoResponse(raw, 'IRR');
    return NextResponse.json(transformed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch last waterfall result';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
