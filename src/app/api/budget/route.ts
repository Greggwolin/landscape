// app/api/budget/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

import { requireAuth, requireProjectAccess } from '@/lib/api/requireAuth';
export async function GET(request: NextRequest) {
  const __qProjectId = new URL(request.url).searchParams.get('project_id');
  const __auth = await requireProjectAccess(request, __qProjectId);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = Number(searchParams.get('project_id'));
    
    if (!projectId || isNaN(projectId)) {
      return NextResponse.json({ 
        error: 'Valid project_id parameter required' 
      }, { status: 400 });
    }
    
    const result = await sql`
      SELECT 
        budget_id,
        devphase_id as phase_id,
        budget_category,
        budget_subcategory,
        amount
      FROM landscape.tbl_budget
      WHERE devphase_id IN (
        SELECT phase_id FROM landscape.tbl_phase WHERE project_id = ${projectId}
      )
      ORDER BY budget_category, budget_subcategory;
    `;

    // Handle empty result
    return NextResponse.json(result || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Budget API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch budget data',
      details: message 
    }, { status: 500 });
  }
}