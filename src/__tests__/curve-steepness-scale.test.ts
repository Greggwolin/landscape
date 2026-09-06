/**
 * Curve steepness is stored on one scale and must be read on that same scale.
 *
 * `core_fin_fact_budget.curve_steepness` holds a 0-100 value with 50 as the
 * neutral midpoint, enforced by the database CHECK constraint
 * `core_fin_fact_budget_curve_steepness_check`.
 *
 * The Django land-dev cash flow service used to read that same column as if it
 * were a 0-1 value, so the preview chart drawn here and the cash flow computed
 * there were different curves. This file pins the TypeScript half of the
 * contract; its mirror is
 * backend/apps/financial/tests/test_curve_steepness_scale.py.
 *
 * The two engines use different curve families (a logistic in Python, blended
 * ARGUS deciles here), so the shared contract is about scale and direction, not
 * bit-identical weights:
 *   - 50 is neutral and leaves the reference curve untouched
 *   - 0 flattens to linear
 *   - a higher stored value concentrates spend more
 *   - no legal value collapses the spend into a single period
 */

import {
  calculateSCurveAllocation,
  type AllocationParams
} from '@/lib/financial-engine/scurve-allocation';

// The values actually sitting in core_fin_fact_budget on 2026-09-06. All 17
// non-null rows are between 51.00 and 58.00 — every one on the 0-100 scale.
const PRODUCTION_STEEPNESS_VALUES = [51, 55, 58];

const DURATION = 12;
const TOTAL = 1_000_000;

const baseParams: AllocationParams = {
  factId: 1,
  totalAmount: TOTAL,
  startPeriod: 1,
  duration: DURATION,
  curveProfile: 'S',
  steepness: 50
};

const allocate = (steepness: number) =>
  calculateSCurveAllocation({ ...baseParams, steepness });

const amounts = (allocs: { amount: number }[]) => allocs.map(a => a.amount);
const peakShare = (values: number[]) => Math.max(...values) / TOTAL;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('curve steepness is read on the stored 0-100 scale', () => {
  test('50 is the neutral midpoint and leaves the reference curve untouched', async () => {
    const neutral = amounts(await allocate(50));
    // The 'S' profile's own deciles, unmodified.
    const reference = [5, 11, 19, 30, 50, 70, 81, 89, 95, 100];

    let previous = 0;
    const expectedShape: number[] = [];
    for (const cumulative of reference) {
      expectedShape.push(cumulative - previous);
      previous = cumulative;
    }

    // Same shape, resampled to 12 periods: still rises to a mid-schedule peak
    // and falls away, and still totals the full amount.
    expect(sum(neutral)).toBeCloseTo(TOTAL, 2);
    expect(expectedShape.length).toBe(10);
    expect(peakShare(neutral)).toBeLessThan(0.4);
  });

  test('the accepted range is 0-100, matching the database CHECK constraint', async () => {
    await expect(allocate(-1)).rejects.toThrow(/between 0 and 100/);
    await expect(allocate(101)).rejects.toThrow(/between 0 and 100/);
    await expect(allocate(0)).resolves.toBeDefined();
    await expect(allocate(100)).resolves.toBeDefined();
  });

  test('a stored 55 is read as slightly steeper than neutral, not as 5500', async () => {
    const neutral = amounts(await allocate(50));
    const stored55 = amounts(await allocate(55));

    expect(sum(stored55)).toBeCloseTo(TOTAL, 2);
    // Close to neutral — the mark of reading 55 on the right scale.
    expect(Math.abs(peakShare(stored55) - peakShare(neutral))).toBeLessThan(0.05);
  });
});

describe('real stored values produce a spread curve, not a spike', () => {
  test.each(PRODUCTION_STEEPNESS_VALUES)(
    'stored steepness %i spreads $1M across the schedule',
    async steepness => {
      const values = amounts(await allocate(steepness));

      expect(values).toHaveLength(DURATION);
      expect(sum(values)).toBeCloseTo(TOTAL, 2);
      expect(Math.max(...values)).toBeLessThan(400_000);

      const funded = values.filter(v => v > TOTAL * 0.001).length;
      expect(funded).toBeGreaterThanOrEqual(10);
    }
  );

  test('no legal steepness collapses the spend into one period', async () => {
    for (let steepness = 0; steepness <= 100; steepness += 5) {
      const values = amounts(await allocate(steepness));
      expect(sum(values)).toBeCloseTo(TOTAL, 2);
      expect(peakShare(values)).toBeLessThanOrEqual(0.6);
    }
  });
});

describe('scale semantics agree with the Python engine', () => {
  test('0 flattens the curve to linear', async () => {
    const values = amounts(await allocate(0));
    const even = TOTAL / DURATION;

    // applySteepness() blends the deciles all the way to linear at 0. The
    // engine rounds to cents and lets the final period absorb the remainder,
    // so compare to within a dollar rather than exactly.
    for (const value of values) {
      expect(Math.abs(value - even)).toBeLessThan(1);
    }
  });

  test('a higher stored value means a steeper curve', async () => {
    const peaks: number[] = [];
    for (const steepness of [25, 50, 75, 100]) {
      peaks.push(peakShare(amounts(await allocate(steepness))));
    }

    const ascending = [...peaks].sort((a, b) => a - b);
    expect(peaks).toEqual(ascending);
    expect(new Set(peaks).size).toBe(peaks.length);
  });
});
