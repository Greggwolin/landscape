/**
 * POST /api/market/geos/bootstrap
 * Auto-seed geo_xwalk for a city that isn't found in the database.
 *
 * Resolves the full geographic hierarchy via Census Bureau APIs:
 *   US → State → MSA/μSA (if applicable) → County → City
 *
 * Body: { city: string, state: string }
 * Returns: { success: true, ...BootstrapResult } or error
 */

import { NextRequest, NextResponse } from 'next/server';
import { bootstrapCity } from '@/lib/geo/bootstrap';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, state } = body;

    if (!city || !state) {
      return NextResponse.json(
        { error: 'city and state are required' },
        { status: 400 },
      );
    }

    const result = await bootstrapCity(city.trim(), state.trim());

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[geo-bootstrap] Bootstrap error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to bootstrap geography',
        success: false,
      },
      { status: 500 },
    );
  }
}
