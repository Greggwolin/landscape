/**
 * S-Curve Period Allocation Engine
 *
 * Calculates period-by-period distribution of costs/revenues using:
 * 1. Named curve profiles (Standard, Front-Loaded, Back-Loaded, etc.)
 * 2. Custom steepness modifier (0-100 scale)
 *
 * Based on ARGUS-style cumulative percentage curves.
 */

import { sql } from '@/lib/db';
import {
  fetchPeriodsBySequences,
  type PeriodMetadata
} from '@/lib/financial-engine/period-utils';

const DEFAULT_CURVE_CODE = 'S';

const BUILTIN_CURVES: Record<string, number[]> = {
  S: [5, 11, 19, 30, 50, 70, 81, 89, 95, 100],
  S1: [15, 28, 40, 52, 64, 75, 84, 91, 96, 100],
  S2: [4, 9, 16, 25, 36, 48, 60, 72, 85, 100],
  S3: [3, 8, 15, 25, 50, 75, 85, 92, 97, 100],
  S4: [8, 15, 23, 32, 50, 68, 77, 85, 92, 100]
};

export interface CurveProfile {
  curveId: number;
  curveName: string;
  curveCode: string;
  description: string | null;
  deciles: number[]; // pct at 10%, 20%, ..., 100%
}

export interface AllocationParams {
  factId: number;
  totalAmount: number;
  startPeriod: number;
  duration: number;
  curveProfile?: string; // e.g., 'S', 'S1', 'S2', 'custom'
  curveId?: number; // optional direct reference
  steepness?: number; // 0-100, default 50
}

export interface PeriodAllocation {
  periodSequence: number;
  periodId?: number;
  periodStartDate?: string;
  periodEndDate?: string;
  periodLabel?: string;
  amount: number;
  cumulativeAmount: number;
  cumulativePercent: number;
}

function normalizeCurveCode(code?: string | null): string | undefined {
  if (!code) return undefined;
  const trimmed = code.trim().toUpperCase();
  return trimmed === '' ? undefined : trimmed;
}

async function getCurveProfile(opts: {
  curveCode?: string;
  curveId?: number;
}): Promise<CurveProfile> {
  const requestedCode = normalizeCurveCode(opts.curveCode);
  const isCustom = requestedCode === 'CUSTOM';
  const effectiveCode = isCustom ? DEFAULT_CURVE_CODE : requestedCode;

  let rows: Array<{
    curveId: number;
    curveName: string;
    curveCode: string;
    description: string | null;
    deciles: (string | number)[];
  }> = [];

  if (process.env.DATABASE_URL) {
    try {
      if (opts.curveId) {
        rows = await sql<{
          curveId: number;
          curveName: string;
          curveCode: string;
          description: string | null;
          deciles: (string | number)[];
        }>`
          SELECT
            curve_id AS "curveId",
            curve_name AS "curveName",
            curve_code AS "curveCode",
            description,
            ARRAY[
              pct_at_10, pct_at_20, pct_at_30, pct_at_40, pct_at_50,
              pct_at_60, pct_at_70, pct_at_80, pct_at_90, pct_at_100
            ] AS deciles
          FROM landscape.core_fin_curve_profile
          WHERE curve_id = ${opts.curveId}
            AND is_active = TRUE
          LIMIT 1
        `;
      } else {
        const codeToUse = effectiveCode ?? DEFAULT_CURVE_CODE;
        rows = await sql<{
          curveId: number;
          curveName: string;
          curveCode: string;
          description: string | null;
          deciles: (string | number)[];
        }>`
          SELECT
            curve_id AS "curveId",
            curve_name AS "curveName",
            curve_code AS "curveCode",
            description,
            ARRAY[
              pct_at_10, pct_at_20, pct_at_30, pct_at_40, pct_at_50,
              pct_at_60, pct_at_70, pct_at_80, pct_at_90, pct_at_100
            ] AS deciles
          FROM landscape.core_fin_curve_profile
          WHERE curve_code = ${codeToUse}
            AND is_active = TRUE
          LIMIT 1
        `;
      }
    } catch (queryError) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Falling back to built-in curve profile:', queryError);
      }
      rows = [];
    }
  }

  if (rows.length > 0) {
    const row = rows[0];
    return {
      ...row,
      curveCode: normalizeCurveCode(row.curveCode) ?? DEFAULT_CURVE_CODE,
      deciles: row.deciles.map(value => Number(value))
    };
  }

  const fallbackCode = effectiveCode ?? DEFAULT_CURVE_CODE;
  const fallback = BUILTIN_CURVES[fallbackCode as keyof typeof BUILTIN_CURVES];
  if (!fallback) {
    throw new Error(`Curve profile '${opts.curveCode ?? opts.curveId ?? 'unknown'}' not found`);
  }

  return {
    curveId: opts.curveId ?? 0,
    curveName: 'Fallback Profile',
    curveCode: fallbackCode,
    description: 'Built-in fallback curve profile',
    deciles: fallback
  };
}

function applySteepness(deciles: number[], steepness: number): number[] {
  if (steepness === 50) return deciles;

  const clamped = Math.min(100, Math.max(0, steepness));
  const blend = (clamped - 50) / 50; // -1 → flatten to linear, +1 → exaggerate
  const intensity = 1 + blend; // 0..2

  const adjusted = deciles.map((pct, index) => {
    const linearPct = (index + 1) * 10;
    const difference = pct - linearPct;
    const value = linearPct + difference * intensity;
    return Math.max(0, Math.min(100, value));
  });

  // Enforce monotonic increase
  let lastValue = 0;
  for (let i = 0; i < adjusted.length; i++) {
    lastValue = Math.max(lastValue, adjusted[i]);
    adjusted[i] = lastValue;
  }

  adjusted[adjusted.length - 1] = 100;
  return adjusted;
}

function interpolateCumulative(timePercent: number, deciles: number[]): number {
  if (timePercent <= 0) return 0;
  if (timePercent >= 100) return 100;

  const decileIndex = Math.floor(timePercent / 10);
  const lowerTime = decileIndex * 10;
  const upperTime = Math.min((decileIndex + 1) * 10, 100);
  const lowerPct = decileIndex === 0 ? 0 : deciles[decileIndex - 1] ?? 0;
  const upperPct = deciles[Math.min(deciles.length - 1, decileIndex)] ?? 100;
  const span = upperTime - lowerTime || 1;
  const fraction = (timePercent - lowerTime) / span;

  return lowerPct + fraction * (upperPct - lowerPct);
}

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function calculateSCurveAllocation(
  params: AllocationParams
): Promise<PeriodAllocation[]> {
  const { totalAmount, startPeriod, duration } = params;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Total amount must be greater than 0');
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Duration must be greater than 0');
  }
  if (!Number.isFinite(startPeriod)) {
    throw new Error('Start period is required');
  }

  const steepness = params.steepness ?? 50;
  if (steepness < 0 || steepness > 100) {
    throw new Error('Steepness must be between 0 and 100');
  }

  const profile = await getCurveProfile({
    curveCode: params.curveProfile,
    curveId: params.curveId
  });
  const adjustedDeciles = applySteepness(profile.deciles, steepness);

  const allocations: PeriodAllocation[] = [];
  let cumulativeAmount = 0;

  for (let i = 0; i < duration; i++) {
    const periodSequence = startPeriod + i;
    const timeStart = (i / duration) * 100;
    const timeEnd = ((i + 1) / duration) * 100;
    const cumulativePctStart = interpolateCumulative(timeStart, adjustedDeciles);
    const cumulativePctEnd = interpolateCumulative(timeEnd, adjustedDeciles);
    const incrementalPct = cumulativePctEnd - cumulativePctStart;
    const amount = roundToCents((totalAmount * incrementalPct) / 100);
    cumulativeAmount = roundToCents(cumulativeAmount + amount);

    allocations.push({
      periodSequence,
      amount,
      cumulativeAmount,
      cumulativePercent: cumulativePctEnd
    });
  }

  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  const difference = roundToCents(totalAmount - allocatedTotal);

  if (Math.abs(difference) > 0.01) {
    allocations[allocations.length - 1].amount = roundToCents(
      allocations[allocations.length - 1].amount + difference
    );
    allocations[allocations.length - 1].cumulativeAmount = roundToCents(totalAmount);
  }

  return allocations;
}

export async function savePeriodAllocations(
  projectId: number,
  factId: number,
  allocations: PeriodAllocation[],
  options?: { useTransaction?: boolean }
): Promise<PeriodMetadata[]> {
  if (allocations.length === 0) {
    throw new Error('Allocation list is empty');
  }

  const sequences = allocations.map(a => a.periodSequence);
  const periodMetadata = await fetchPeriodsBySequences(projectId, sequences);

  if (periodMetadata.length !== allocations.length) {
    const missing = allocations
      .filter(a => !periodMetadata.find(p => p.periodSequence === a.periodSequence))
      .map(a => a.periodSequence);
    throw new Error(
      `Missing calculation periods for sequences: ${missing.join(', ')}`
    );
  }

  const periodBySequence = new Map(
    periodMetadata.map(period => [period.periodSequence, period])
  );

  const useTransaction = options?.useTransaction !== false;
  if (useTransaction) {
    await sql`BEGIN`;
  }
  try {
    await sql`DELETE FROM landscape.tbl_budget_timing WHERE fact_id = ${factId}`;

    for (const allocation of allocations) {
      const periodId = periodBySequence.get(allocation.periodSequence)?.periodId;
      if (!periodId) {
        throw new Error(`Period ${allocation.periodSequence} not found for project ${projectId}`);
      }

      await sql`
        INSERT INTO landscape.tbl_budget_timing (
          fact_id,
          period_id,
          amount,
          timing_method
        ) VALUES (
          ${factId},
          ${periodId},
          ${allocation.amount},
          'curve'
        )
      `;
    }

    if (useTransaction) {
      await sql`COMMIT`;
    }
    return periodMetadata;
  } catch (error) {
    if (useTransaction) {
      await sql`ROLLBACK`;
    }
    throw error;
  }
}

export async function allocateBudgetItem(
  projectId: number,
  params: AllocationParams,
  options?: { transactional?: boolean }
): Promise<{
  success: boolean;
  allocations: PeriodAllocation[];
  summary: {
    totalAmount: number;
    allocatedAmount: number;
    periodCount: number;
    avgPerPeriod: number;
    peakPeriod: number;
    peakAmount: number;
  };
}> {
  if (!projectId) {
    throw new Error('Project ID is required to save allocations');
  }

  const allocations = await calculateSCurveAllocation(params);
  const transactional = options?.transactional !== false;
  const periodMetadata = await savePeriodAllocations(projectId, params.factId, allocations, {
    useTransaction: transactional
  });
  const metadataBySequence = new Map(periodMetadata.map(period => [period.periodSequence, period]));

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const peakAllocation = allocations.reduce(
    (max, allocation) => (allocation.amount > max.amount ? allocation : max),
    allocations[0]
  );

  return {
    success: true,
    allocations: allocations.map(allocation => {
      const metadata = metadataBySequence.get(allocation.periodSequence);
      return {
        ...allocation,
        periodId: metadata?.periodId,
        periodStartDate: metadata?.periodStartDate,
        periodEndDate: metadata?.periodEndDate,
        periodLabel: metadata?.periodLabel
      };
    }),
    summary: {
      totalAmount: params.totalAmount,
      allocatedAmount: totalAllocated,
      periodCount: allocations.length,
      avgPerPeriod: roundToCents(totalAllocated / allocations.length),
      peakPeriod: peakAllocation.periodSequence,
      peakAmount: peakAllocation.amount
    }
  };
}
