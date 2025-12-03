/**
 * GET /api/projects/[projectId]/cash-flow/summary
 *
 * Get cash flow summary metrics only (lightweight endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCashFlow } from '@/lib/financial-engine/cashflow';
import type { CashFlowEngineOptions } from '@/lib/financial-engine/cashflow';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const discountRate = searchParams.get('discountRate');
    const includeFinancing = searchParams.get('includeFinancing') === 'true';

    // Build options
    const options: CashFlowEngineOptions = {
      projectId,
      periodType: 'month',
      includeFinancing,
      discountRate: discountRate ? parseFloat(discountRate) : undefined,
    };

    // Generate cash flow (full calculation required for accurate summary)
    console.log(`Generating cash flow summary for project ${projectId}...`);
    const cashFlow = await generateCashFlow(options);

    // Return summary only
    return NextResponse.json({
      success: true,
      data: {
        projectId: cashFlow.projectId,
        generatedAt: cashFlow.generatedAt,
        summary: cashFlow.summary,
        periodCount: cashFlow.totalPeriods,
        startDate: cashFlow.startDate,
        endDate: cashFlow.endDate,
      },
    });
  } catch (error: any) {
    console.error('Error generating cash flow summary:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate cash flow summary',
      },
      { status: 500 }
    );
  }
}
