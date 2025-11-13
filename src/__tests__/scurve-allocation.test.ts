import { calculateSCurveAllocation, type AllocationParams } from '@/lib/financial-engine/scurve-allocation';

describe('S-Curve Allocation Engine', () => {
  const baseParams: AllocationParams = {
    factId: 1,
    totalAmount: 1_000_000,
    startPeriod: 1,
    duration: 12,
    curveProfile: 'S',
    steepness: 50
  };

  test('Standard S-curve totals to 100% of amount', async () => {
    const allocations = await calculateSCurveAllocation(baseParams);
    const total = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

    expect(allocations).toHaveLength(baseParams.duration);
    expect(total).toBeCloseTo(baseParams.totalAmount, 2);
  });

  test('Front-loaded curve allocates majority in first half', async () => {
    const allocations = await calculateSCurveAllocation({
      ...baseParams,
      curveProfile: 'S1'
    });

    const firstHalf = allocations.slice(0, baseParams.duration / 2).reduce((sum, alloc) => sum + alloc.amount, 0);
    expect(firstHalf).toBeGreaterThan(baseParams.totalAmount * 0.5);
  });

  test('Back-loaded curve allocates majority in second half', async () => {
    const allocations = await calculateSCurveAllocation({
      ...baseParams,
      curveProfile: 'S2'
    });

    const secondHalf = allocations.slice(baseParams.duration / 2).reduce((sum, alloc) => sum + alloc.amount, 0);
    expect(secondHalf).toBeGreaterThan(baseParams.totalAmount * 0.5);
  });

  test('Lower steepness flattens the curve (less variance)', async () => {
    const standard = await calculateSCurveAllocation(baseParams);
    const flatter = await calculateSCurveAllocation({
      ...baseParams,
      steepness: 25
    });

    const standardVariance = calculateVariance(standard.map(a => a.amount));
    const flatterVariance = calculateVariance(flatter.map(a => a.amount));
    expect(flatterVariance).toBeLessThan(standardVariance);
  });

  test('Higher steepness steepens the curve (more variance)', async () => {
    const standard = await calculateSCurveAllocation(baseParams);
    const steeper = await calculateSCurveAllocation({
      ...baseParams,
      steepness: 75
    });

    const standardVariance = calculateVariance(standard.map(a => a.amount));
    const steeperVariance = calculateVariance(steeper.map(a => a.amount));
    expect(steeperVariance).toBeGreaterThan(standardVariance);
  });
});

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}
