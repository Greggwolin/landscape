/**
 * Timeline Calculation API
 * POST /api/projects/[projectId]/timeline/calculate - Calculate and save timeline
 * GET /api/projects/[projectId]/timeline/calculate - Preview timeline (dry run)
 */

import { NextRequest, NextResponse } from 'next/server';
import { recalculateProjectTimeline } from '@/lib/timeline-engine/cpm-calculator';

type Params = { params: Promise<{ projectId: string }> };

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  return false;
}

async function handleCalculation(
  projectId: string,
  body: Record<string, unknown>,
  overrideOptions: { dryRun: boolean; triggerEvent: string }
) {
  const dryRun = overrideOptions.dryRun || parseBoolean(body.dry_run ?? body.validateOnly);
  const triggerEvent = body.triggerEvent
    ? String(body.triggerEvent)
    : overrideOptions.triggerEvent || (dryRun ? 'preview' : 'manual');

  const rawUserId = body.userId;
  const parsedUserId =
    typeof rawUserId === 'number'
      ? rawUserId
      : typeof rawUserId === 'string'
      ? Number(rawUserId)
      : undefined;

  try {
    const result = await recalculateProjectTimeline(Number(projectId), {
      dryRun,
      triggerEvent,
      userId: Number.isNaN(parsedUserId) ? undefined : parsedUserId,
      validateOnly: parseBoolean(body.validateOnly)
    });

    return NextResponse.json({
      success: true,
      calculation: result,
      dryRun,
      message: dryRun
        ? 'Timeline preview (not saved - call POST to apply)'
        : 'Timeline calculated and saved successfully'
    });
  } catch (error: any) {
    const isClientError =
      error?.message?.toLowerCase().includes('circular dependency') ||
      error?.message?.toLowerCase().includes('cycles');
    const status = isClientError ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to calculate timeline' },
      { status }
    );
  }
}

export async function POST(request: NextRequest, context: Params) {
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return handleCalculation(projectId, body, { dryRun: parseBoolean(body.dry_run ?? body.validateOnly), triggerEvent: 'manual' });
}

export async function GET(request: NextRequest, context: Params) {
  const { projectId } = await context.params;
  return handleCalculation(projectId, {}, { dryRun: true, triggerEvent: 'preview' });
}
