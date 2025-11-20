// S-Curve Allocation Unit Tests
// Version: v1.0 (2025-10-13)

import {
  generateSCurveAllocation,
  validateAllocation,
  applyAllocationToPeriods,
  calculateCumulativeAllocation,
  calculatePercentComplete,
  findPeriodForPercentage,
  getSCurveProfileDescription,
  type SCurveProfile,
  type AllocationResult
} from '../scurve';

describe('generateSCurveAllocation', () => {
  describe('LINEAR profile', () => {
    it('should distribute amount equally across periods', () => {
      const result = generateSCurveAllocation(1000, 10, 'LINEAR');

      expect(result).toHaveLength(10);
      result.forEach((alloc, i) => {
        expect(alloc.period_offset).toBe(i);
        expect(alloc.amount).toBeCloseTo(100, 2);
        expect(alloc.percentage).toBeCloseTo(0.1, 5);
      });
    });

    it('should handle single period', () => {
      const result = generateSCurveAllocation(1000, 1, 'LINEAR');

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(1000);
      expect(result[0].percentage).toBe(1);
    });

    it('should sum to total amount', () => {
      const result = generateSCurveAllocation(1234567.89, 12, 'LINEAR');
      const sum = result.reduce((s, a) => s + a.amount, 0);

      expect(sum).toBeCloseTo(1234567.89, 2);
    });
  });

  describe('FRONT_LOADED profile', () => {
    it('should allocate 60% in first half, 40% in second half', () => {
      const result = generateSCurveAllocation(1000, 10, 'FRONT_LOADED');

      // First 5 periods should have more
      const firstHalfTotal = result.slice(0, 5).reduce((s, a) => s + a.amount, 0);
      const secondHalfTotal = result.slice(5, 10).reduce((s, a) => s + a.amount, 0);

      expect(firstHalfTotal).toBeCloseTo(600, 2);
      expect(secondHalfTotal).toBeCloseTo(400, 2);
    });

    it('should have equal amounts within each half', () => {
      const result = generateSCurveAllocation(1000, 10, 'FRONT_LOADED');

      const firstPeriodAmount = result[0].amount;
      const lastPeriodAmount = result[9].amount;

      // First 5 periods should be equal
      result.slice(0, 5).forEach(alloc => {
        expect(alloc.amount).toBeCloseTo(firstPeriodAmount, 2);
      });

      // Last 5 periods should be equal
      result.slice(5, 10).forEach(alloc => {
        expect(alloc.amount).toBeCloseTo(lastPeriodAmount, 2);
      });

      // First period should be larger than last period
      expect(firstPeriodAmount).toBeGreaterThan(lastPeriodAmount);
    });

    it('should handle odd number of periods', () => {
      const result = generateSCurveAllocation(1000, 9, 'FRONT_LOADED');

      const sum = result.reduce((s, a) => s + a.amount, 0);
      expect(sum).toBeCloseTo(1000, 2);
    });
  });

  describe('BACK_LOADED profile', () => {
    it('should allocate 40% in first half, 60% in second half', () => {
      const result = generateSCurveAllocation(1000, 10, 'BACK_LOADED');

      const firstHalfTotal = result.slice(0, 5).reduce((s, a) => s + a.amount, 0);
      const secondHalfTotal = result.slice(5, 10).reduce((s, a) => s + a.amount, 0);

      expect(firstHalfTotal).toBeCloseTo(400, 2);
      expect(secondHalfTotal).toBeCloseTo(600, 2);
    });

    it('should have last period larger than first period', () => {
      const result = generateSCurveAllocation(1000, 10, 'BACK_LOADED');

      const firstPeriodAmount = result[0].amount;
      const lastPeriodAmount = result[9].amount;

      expect(lastPeriodAmount).toBeGreaterThan(firstPeriodAmount);
    });
  });

  describe('BELL_CURVE profile', () => {
    it('should peak in the middle periods', () => {
      const result = generateSCurveAllocation(1000, 10, 'BELL_CURVE');

      const firstAmount = result[0].amount;
      const middleAmount = result[5].amount;
      const lastAmount = result[9].amount;

      // Middle should be higher than edges
      expect(middleAmount).toBeGreaterThan(firstAmount);
      expect(middleAmount).toBeGreaterThan(lastAmount);
    });

    it('should be symmetric', () => {
      const result = generateSCurveAllocation(1000, 10, 'BELL_CURVE');

      // First and last should be equal
      expect(result[0].amount).toBeCloseTo(result[9].amount, 2);
      expect(result[1].amount).toBeCloseTo(result[8].amount, 2);
      expect(result[2].amount).toBeCloseTo(result[7].amount, 2);
    });

    it('should sum to total amount', () => {
      const result = generateSCurveAllocation(1000, 10, 'BELL_CURVE');
      const sum = result.reduce((s, a) => s + a.amount, 0);

      expect(sum).toBeCloseTo(1000, 2);
    });
  });

  describe('CUSTOM profile', () => {
    it('should fallback to LINEAR', () => {
      const customResult = generateSCurveAllocation(1000, 10, 'CUSTOM');
      const linearResult = generateSCurveAllocation(1000, 10, 'LINEAR');

      expect(customResult).toEqual(linearResult);
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration by returning single period allocation', () => {
      const result = generateSCurveAllocation(1000, 0, 'LINEAR');

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(1000);
      expect(result[0].percentage).toBe(1);
      expect(result[0].period_offset).toBe(0);
    });

    it('should handle negative duration by returning single period allocation', () => {
      const result = generateSCurveAllocation(1000, -5, 'LINEAR');

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(1000);
    });

    it('should handle zero amount', () => {
      const result = generateSCurveAllocation(0, 10, 'LINEAR');

      expect(result).toHaveLength(10);
      result.forEach(alloc => {
        expect(alloc.amount).toBe(0);
      });
    });

    it('should handle large amounts', () => {
      const result = generateSCurveAllocation(999999999.99, 12, 'LINEAR');
      const sum = result.reduce((s, a) => s + a.amount, 0);

      expect(sum).toBeCloseTo(999999999.99, 2);
    });
  });
});

describe('validateAllocation', () => {
  it('should return true when allocation sums to expected total', () => {
    const alloc = generateSCurveAllocation(1000, 10, 'LINEAR');
    const isValid = validateAllocation(alloc, 1000);

    expect(isValid).toBe(true);
  });

  it('should return true when within tolerance', () => {
    const alloc: AllocationResult[] = [
      { period_offset: 0, amount: 333.34, percentage: 0.33334 },
      { period_offset: 1, amount: 333.33, percentage: 0.33333 },
      { period_offset: 2, amount: 333.33, percentage: 0.33333 }
    ];
    const isValid = validateAllocation(alloc, 1000, 0.01);

    expect(isValid).toBe(true);
  });

  it('should return false when outside tolerance', () => {
    const alloc: AllocationResult[] = [
      { period_offset: 0, amount: 300, percentage: 0.3 },
      { period_offset: 1, amount: 300, percentage: 0.3 },
      { period_offset: 2, amount: 300, percentage: 0.3 }
    ];
    const isValid = validateAllocation(alloc, 1000, 0.01);

    expect(isValid).toBe(false);
  });

  it('should accept custom tolerance', () => {
    const alloc: AllocationResult[] = [
      { period_offset: 0, amount: 950, percentage: 0.95 }
    ];

    expect(validateAllocation(alloc, 1000, 10)).toBe(true);
    expect(validateAllocation(alloc, 1000, 1)).toBe(false);
  });
});

describe('applyAllocationToPeriods', () => {
  it('should offset periods by start period', () => {
    const result = applyAllocationToPeriods(5, 1000, 3, 'LINEAR');

    expect(result).toHaveLength(3);
    expect(result[0].period).toBe(5);
    expect(result[1].period).toBe(6);
    expect(result[2].period).toBe(7);
  });

  it('should preserve amounts from allocation', () => {
    const result = applyAllocationToPeriods(0, 1000, 10, 'LINEAR');

    result.forEach(item => {
      expect(item.amount).toBeCloseTo(100, 2);
    });
  });

  it('should work with all profiles', () => {
    const profiles: SCurveProfile[] = ['LINEAR', 'FRONT_LOADED', 'BACK_LOADED', 'BELL_CURVE'];

    profiles.forEach(profile => {
      const result = applyAllocationToPeriods(0, 1000, 10, profile);
      expect(result).toHaveLength(10);

      const sum = result.reduce((s, item) => s + item.amount, 0);
      expect(sum).toBeCloseTo(1000, 2);
    });
  });
});

describe('calculateCumulativeAllocation', () => {
  it('should calculate cumulative amounts', () => {
    const alloc = generateSCurveAllocation(1000, 10, 'LINEAR');
    const cumulative = calculateCumulativeAllocation(alloc);

    expect(cumulative[0].cumulative_amount).toBeCloseTo(100, 2);
    expect(cumulative[4].cumulative_amount).toBeCloseTo(500, 2);
    expect(cumulative[9].cumulative_amount).toBeCloseTo(1000, 2);
  });

  it('should calculate cumulative percentages', () => {
    const alloc = generateSCurveAllocation(1000, 10, 'LINEAR');
    const cumulative = calculateCumulativeAllocation(alloc);

    expect(cumulative[0].cumulative_percentage).toBeCloseTo(0.1, 5);
    expect(cumulative[4].cumulative_percentage).toBeCloseTo(0.5, 5);
    expect(cumulative[9].cumulative_percentage).toBeCloseTo(1.0, 5);
  });

  it('should preserve original allocation data', () => {
    const alloc = generateSCurveAllocation(1000, 10, 'LINEAR');
    const cumulative = calculateCumulativeAllocation(alloc);

    cumulative.forEach((item, i) => {
      expect(item.period_offset).toBe(alloc[i].period_offset);
      expect(item.amount).toBe(alloc[i].amount);
      expect(item.percentage).toBe(alloc[i].percentage);
    });
  });
});

describe('calculatePercentComplete', () => {
  it('should return 0 before start period', () => {
    const pct = calculatePercentComplete(2, 5, 10, 'LINEAR');
    expect(pct).toBe(0);
  });

  it('should return 1 after completion', () => {
    const pct = calculatePercentComplete(20, 5, 10, 'LINEAR');
    expect(pct).toBe(1);
  });

  it('should calculate correct percentage for LINEAR', () => {
    const pct = calculatePercentComplete(9, 5, 10, 'LINEAR');
    // Period 9 is 5 periods after start (periods 5,6,7,8,9 complete)
    expect(pct).toBeCloseTo(0.5, 5);
  });

  it('should work with FRONT_LOADED profile', () => {
    const pct = calculatePercentComplete(9, 5, 10, 'FRONT_LOADED');
    // First 5 periods (5-9) = 60% complete
    expect(pct).toBeCloseTo(0.6, 2);
  });

  it('should work with BELL_CURVE profile', () => {
    const pct = calculatePercentComplete(5, 0, 10, 'BELL_CURVE');
    // First period of 10 should be less than 10% due to bell curve
    expect(pct).toBeLessThan(0.15);
    expect(pct).toBeGreaterThan(0);
  });
});

describe('findPeriodForPercentage', () => {
  it('should find correct period for LINEAR profile', () => {
    const period = findPeriodForPercentage(0.5, 0, 10, 'LINEAR');
    expect(period).toBe(4); // 50% at period 4 (0-4 = 5 periods = 50%)
  });

  it('should find correct period for FRONT_LOADED profile', () => {
    const period = findPeriodForPercentage(0.6, 0, 10, 'FRONT_LOADED');
    expect(period).toBeLessThanOrEqual(5); // 60% should be reached by period 5
  });

  it('should return start period for 0%', () => {
    const period = findPeriodForPercentage(0, 5, 10, 'LINEAR');
    expect(period).toBe(5);
  });

  it('should return end period for 100%', () => {
    const period = findPeriodForPercentage(1.0, 5, 10, 'LINEAR');
    expect(period).toBe(14); // Start 5 + duration 10 - 1
  });

  it('should respect start period offset', () => {
    const period = findPeriodForPercentage(0.5, 10, 10, 'LINEAR');
    expect(period).toBe(14); // 10 + 4
  });
});

describe('getSCurveProfileDescription', () => {
  it('should return descriptions for all profiles', () => {
    expect(getSCurveProfileDescription('LINEAR')).toContain('Equal');
    expect(getSCurveProfileDescription('FRONT_LOADED')).toContain('60%');
    expect(getSCurveProfileDescription('BACK_LOADED')).toContain('40%');
    expect(getSCurveProfileDescription('BELL_CURVE')).toContain('Normal');
    expect(getSCurveProfileDescription('CUSTOM')).toContain('Custom');
  });

  it('should handle unknown profile', () => {
    const result = getSCurveProfileDescription('INVALID' as SCurveProfile);
    expect(result).toContain('Unknown');
  });
});

describe('integration tests', () => {
  it('should handle realistic budget item scenario', () => {
    // Site grading: $500K over 6 months, front-loaded, starting period 3
    const allocations = applyAllocationToPeriods(3, 500000, 6, 'FRONT_LOADED');

    expect(allocations).toHaveLength(6);
    expect(allocations[0].period).toBe(3);
    expect(allocations[5].period).toBe(8);

    const sum = allocations.reduce((s, a) => s + a.amount, 0);
    expect(sum).toBeCloseTo(500000, 2);

    // First 3 periods should have 60%
    const firstHalf = allocations.slice(0, 3).reduce((s, a) => s + a.amount, 0);
    expect(firstHalf).toBeCloseTo(300000, 2);
  });

  it('should handle revenue absorption scenario', () => {
    // Lot sales: 50 lots at $200K each, 10 per period, bell curve distribution
    const totalRevenue = 50 * 200000; // $10M
    const allocations = generateSCurveAllocation(totalRevenue, 5, 'BELL_CURVE');

    expect(validateAllocation(allocations, totalRevenue)).toBe(true);

    // Calculate cumulative to track progress
    const cumulative = calculateCumulativeAllocation(allocations);

    // By period 2 (middle), should have most revenue
    expect(cumulative[2].cumulative_percentage).toBeGreaterThan(0.4);
  });

  it('should support dependency trigger calculations', () => {
    // Budget item: $1M over 12 months, LINEAR
    // Dependent item should start when 50% complete
    const startPeriod = 0;
    const duration = 12;
    const triggerPercentage = 0.5;

    const triggerPeriod = findPeriodForPercentage(
      triggerPercentage,
      startPeriod,
      duration,
      'LINEAR'
    );

    expect(triggerPeriod).toBe(5); // 50% at period 5

    // Verify with reverse calculation
    const actualPercent = calculatePercentComplete(
      triggerPeriod,
      startPeriod,
      duration,
      'LINEAR'
    );

    expect(actualPercent).toBeGreaterThanOrEqual(triggerPercentage);
  });
});
