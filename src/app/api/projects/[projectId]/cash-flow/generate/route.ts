/**
 * POST /api/projects/[projectId]/cash-flow/generate
 *
 * Generate complete cash flow schedule for a land development project
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCashFlow } from '@/lib/financial-engine/cashflow';
import type { CashFlowEngineOptions, PeriodType } from '@/lib/financial-engine/cashflow';

export async function POST(
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

    // Parse request body
    const body = await request.json();

    // Build options
    const options: CashFlowEngineOptions = {
      projectId,
      periodType: (body.periodType as PeriodType) || 'month',
      includeFinancing: body.includeFinancing === true,
      discountRate: body.discountRate !== undefined
        ? parseFloat(body.discountRate)
        : undefined,
      startPeriod: body.startPeriod !== undefined
        ? parseInt(body.startPeriod, 10)
        : undefined,
      endPeriod: body.endPeriod !== undefined
        ? parseInt(body.endPeriod, 10)
        : undefined,
      containerIds: Array.isArray(body.containerIds)
        ? body.containerIds.map((id: any) => parseInt(id, 10))
        : undefined,
      scenarioId: body.scenarioId !== undefined
        ? parseInt(body.scenarioId, 10)
        : undefined,
    };

    // Validate options
    if (options.discountRate !== undefined && isNaN(options.discountRate)) {
      return NextResponse.json(
        { error: 'Invalid discount rate' },
        { status: 400 }
      );
    }

    if (options.startPeriod !== undefined && isNaN(options.startPeriod)) {
      return NextResponse.json(
        { error: 'Invalid start period' },
        { status: 400 }
      );
    }

    if (options.endPeriod !== undefined && isNaN(options.endPeriod)) {
      return NextResponse.json(
        { error: 'Invalid end period' },
        { status: 400 }
      );
    }

    // Generate cash flow
    console.log(`Generating cash flow for project ${projectId}...`);
    const startTime = Date.now();

    const cashFlow = await generateCashFlow(options);

    const duration = Date.now() - startTime;
    console.log(`Cash flow generated in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: cashFlow,
      meta: {
        generationTime: duration,
        periodCount: cashFlow.periods.length,
        sectionCount: cashFlow.sections.length,
      },
    });
  } catch (error: any) {
    console.error('Error generating cash flow:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate cash flow',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
