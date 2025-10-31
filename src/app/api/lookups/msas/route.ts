/**
 * MSA (Metropolitan Statistical Area) Lookup API
 *
 * GET /api/lookups/msas
 * Returns all active MSAs for dropdown population
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export interface MSA {
  msa_id: number;
  msa_name: string;
  msa_code?: string;
  state_abbreviation: string;
  primary_city?: string;
  is_active: boolean;
  display_order?: number;
}

export async function GET() {
  try {
    const msas = await sql<MSA[]>`
      SELECT
        msa_id,
        msa_name,
        msa_code,
        state_abbreviation,
        primary_city,
        is_active,
        display_order
      FROM landscape.tbl_msa
      WHERE is_active = TRUE
      ORDER BY display_order, msa_name
    `;

    return NextResponse.json(msas);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MSA lookup API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch MSAs',
        details: message
      },
      { status: 500 }
    );
  }
}
