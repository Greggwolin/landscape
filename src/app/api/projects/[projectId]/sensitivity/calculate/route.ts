import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calculateIRR, calculateNPV } from '@/lib/calculations/metrics';

type Params = {
  projectId: string;
};

interface AdjustmentData {
  baseValue: number;
  adjustment: number; // -100 to +100
  adjustedValue: number;
}

interface RequestBody {
  adjustments: Record<string, AdjustmentData>;
}

/**
 * POST /api/projects/[projectId]/sensitivity/calculate
 *
 * Phase 4: Sensitivity Analysis Calculation Endpoint
 *
 * Calculates Land Value, IRR, and NPV based on adjusted assumptions.
 * Called with 300ms debounce as user moves sliders.
 *
 * Uses existing calculation engine from src/lib/calculations/metrics.ts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body: RequestBody = await request.json();
    const { adjustments } = body;

    // Extract adjusted values
    const unitsSold = adjustments.units_sold?.adjustedValue || 0;
    const pricePerUnit = adjustments.price_per_unit?.adjustedValue || 0;
    const absorptionRate = adjustments.absorption_rate?.adjustedValue || 1;
    const developmentCost = adjustments.development_cost?.adjustedValue || 0;
    const operatingExpenses = adjustments.operating_expenses?.adjustedValue || 0;

    // Discount rate: the slider if the user moved it, otherwise the project's own
    // setting. If neither exists we return no NPV rather than inventing a rate --
    // this used to fall back to a hardcoded 0.10, so an unset project silently
    // produced an NPV discounted at 10% that read exactly like a chosen one
    // (Gregg, 2026-09-04). `??` not `||`, so a deliberate 0% is honoured.
    const sliderRate = adjustments.discount_rate?.adjustedValue;
    let discountRate: number | null =
      typeof sliderRate === 'number' && Number.isFinite(sliderRate) ? sliderRate : null;

    if (discountRate === null) {
      const settingsRow = await sql`
        SELECT discount_rate
        FROM landscape.tbl_project_settings
        WHERE project_id = ${id}
      `;
      const stored = settingsRow[0]?.discount_rate;
      const storedNum = stored === null || stored === undefined ? NaN : Number(stored);
      discountRate = Number.isFinite(storedNum) ? storedNum : null;
    }

    // Calculate total revenue
    const totalRevenue = unitsSold * pricePerUnit;

    // Calculate total costs
    const totalCosts = developmentCost + operatingExpenses;

    // Residual Land Value = (Revenue - Costs) / (1 + discount rate)
    const landValue = totalRevenue - totalCosts;

    // Generate cash flows for IRR/NPV calculation
    // Simplified: assume even distribution over absorption period
    const holdPeriodMonths = Math.ceil(unitsSold / absorptionRate);
    const monthlyRevenue = totalRevenue / holdPeriodMonths;
    const monthlyOpex = operatingExpenses / holdPeriodMonths;
    const monthlyCashFlow = monthlyRevenue - monthlyOpex;

    const cashFlows: number[] = Array(holdPeriodMonths).fill(monthlyCashFlow);

    // Calculate IRR (may return NaN if doesn't converge)
    const irr = calculateIRR(developmentCost, cashFlows, 0);

    // Calculate NPV -- only when a discount rate actually exists.
    const npv =
      discountRate === null
        ? null
        : calculateNPV(developmentCost, cashFlows, 0, discountRate);

    return NextResponse.json({
      landValue,
      irr: isNaN(irr) ? null : irr,
      npv,
      discountRate,
      npvUnavailableReason:
        discountRate === null
          ? 'No discount rate is set for this project. Set one in project settings, or move the discount rate slider, to see NPV.'
          : null,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to calculate sensitivity:', error);
    return NextResponse.json(
      { error: 'Failed to calculate sensitivity', details: message },
      { status: 500 }
    );
  }
}
