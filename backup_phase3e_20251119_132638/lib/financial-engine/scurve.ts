// S-Curve Allocation Utilities – Phase 3 Calculation Engine
// Version: v1.0 (2025-10-13)
//
// Provides timing distribution functions for spreading costs/revenue across periods
// using various S-curve profiles (LINEAR, FRONT_LOADED, BACK_LOADED, BELL_CURVE)

/**
 * S-Curve profile types supported by the financial engine
 */
export type SCurveProfile = 'LINEAR' | 'FRONT_LOADED' | 'BACK_LOADED' | 'BELL_CURVE' | 'CUSTOM';

/**
 * Result of allocating an amount across a single period
 */
export interface AllocationResult {
  period_offset: number;  // 0-based offset from start period
  amount: number;         // Dollar amount allocated to this period
  percentage: number;     // Percentage of total (0-1) allocated to this period
}

/**
 * Generate S-curve allocation across multiple periods
 *
 * @param totalAmount - Total dollar amount to allocate
 * @param duration - Number of periods to allocate across
 * @param profile - S-curve profile type (default: LINEAR)
 * @returns Array of allocation results, one per period
 *
 * @example
 * // Allocate $1M across 10 periods using front-loaded profile
 * const allocations = generateSCurveAllocation(1000000, 10, 'FRONT_LOADED');
 * // Result: 60% in first 5 periods, 40% in last 5 periods
 */
export function generateSCurveAllocation(
  totalAmount: number,
  duration: number,
  profile: SCurveProfile = 'LINEAR'
): AllocationResult[] {
  // Edge case: zero or negative duration
  if (duration <= 0) {
    return [{ period_offset: 0, amount: totalAmount, percentage: 1 }];
  }

  const out: AllocationResult[] = [];

  if (profile === 'LINEAR') {
    // Equal distribution across all periods
    const amountPerPeriod = totalAmount / duration;
    for (let i = 0; i < duration; i++) {
      out.push({
        period_offset: i,
        amount: amountPerPeriod,
        percentage: 1 / duration
      });
    }
  } else if (profile === 'FRONT_LOADED') {
    // 60% in first half, 40% in second half
    const halfDuration = Math.ceil(duration / 2);
    const tailDuration = duration - halfDuration;
    const frontAmount = (totalAmount * 0.6) / halfDuration;
    const backAmount = (totalAmount * 0.4) / (tailDuration || 1);

    for (let i = 0; i < duration; i++) {
      const amount = i < halfDuration ? frontAmount : backAmount;
      out.push({
        period_offset: i,
        amount: amount,
        percentage: amount / totalAmount
      });
    }
  } else if (profile === 'BACK_LOADED') {
    // 40% in first half, 60% in second half
    const halfDuration = Math.ceil(duration / 2);
    const tailDuration = duration - halfDuration;
    const frontAmount = (totalAmount * 0.4) / halfDuration;
    const backAmount = (totalAmount * 0.6) / (tailDuration || 1);

    for (let i = 0; i < duration; i++) {
      const amount = i < halfDuration ? frontAmount : backAmount;
      out.push({
        period_offset: i,
        amount: amount,
        percentage: amount / totalAmount
      });
    }
  } else if (profile === 'BELL_CURVE') {
    // Normal distribution - peaks in middle, tapers at ends
    const midPoint = duration / 2;
    const weights: number[] = [];
    let totalWeight = 0;

    // Calculate weights using distance from midpoint
    for (let i = 0; i < duration; i++) {
      const distanceFromMid = Math.abs(i - midPoint);
      const weight = Math.max(0, duration - distanceFromMid * 2);
      weights.push(weight);
      totalWeight += weight;
    }

    // Convert weights to amounts
    for (let i = 0; i < duration; i++) {
      const percentage = weights[i] / (totalWeight || 1);
      out.push({
        period_offset: i,
        amount: percentage * totalAmount,
        percentage: percentage
      });
    }
  } else if (profile === 'CUSTOM') {
    // CUSTOM profile not implemented - fallback to LINEAR
    // In future, could read from tbl_custom_curve table
    const amountPerPeriod = totalAmount / duration;
    for (let i = 0; i < duration; i++) {
      out.push({
        period_offset: i,
        amount: amountPerPeriod,
        percentage: 1 / duration
      });
    }
  }

  return out;
}

/**
 * Validate that allocation results sum to expected total
 *
 * @param alloc - Array of allocation results to validate
 * @param expectedTotal - Expected total amount
 * @param tolerance - Acceptable rounding error (default: 0.01)
 * @returns True if sum is within tolerance of expected total
 *
 * @example
 * const allocations = generateSCurveAllocation(1000000, 10, 'LINEAR');
 * const isValid = validateAllocation(allocations, 1000000);
 * // Returns: true
 */
export function validateAllocation(
  alloc: AllocationResult[],
  expectedTotal: number,
  tolerance: number = 0.01
): boolean {
  const sum = alloc.reduce((s, a) => s + a.amount, 0);
  return Math.abs(sum - expectedTotal) <= tolerance;
}

/**
 * Generic API response envelope
 * Used by all Financial Engine API endpoints for consistent response format
 */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
}

/**
 * Apply S-curve allocation to a budget item and return period-by-period breakdown
 *
 * @param startPeriod - Starting period (absolute)
 * @param totalAmount - Total amount to allocate
 * @param duration - Number of periods
 * @param profile - S-curve profile
 * @returns Array of period-amount pairs
 *
 * @example
 * // Site grading starting period 3, $500K over 6 months, front-loaded
 * const breakdown = applyAllocationToPeriods(3, 500000, 6, 'FRONT_LOADED');
 * // Returns: [{period: 3, amount: 60000}, {period: 4, amount: 60000}, ...]
 */
export function applyAllocationToPeriods(
  startPeriod: number,
  totalAmount: number,
  duration: number,
  profile: SCurveProfile = 'LINEAR'
): Array<{ period: number; amount: number; percentage: number }> {
  const allocations = generateSCurveAllocation(totalAmount, duration, profile);

  return allocations.map(alloc => ({
    period: startPeriod + alloc.period_offset,
    amount: alloc.amount,
    percentage: alloc.percentage
  }));
}

/**
 * Calculate cumulative amounts at each period
 *
 * @param allocations - Array of allocation results
 * @returns Array with cumulative amounts added
 *
 * @example
 * const allocations = generateSCurveAllocation(1000000, 10, 'LINEAR');
 * const cumulative = calculateCumulativeAllocation(allocations);
 * // Period 0: $100K cumulative, Period 1: $200K cumulative, etc.
 */
export function calculateCumulativeAllocation(
  allocations: AllocationResult[]
): Array<AllocationResult & { cumulative_amount: number; cumulative_percentage: number }> {
  let cumulativeAmount = 0;
  let cumulativePercentage = 0;

  return allocations.map(alloc => {
    cumulativeAmount += alloc.amount;
    cumulativePercentage += alloc.percentage;

    return {
      ...alloc,
      cumulative_amount: cumulativeAmount,
      cumulative_percentage: cumulativePercentage
    };
  });
}

/**
 * Get S-curve profile description for display
 */
export function getSCurveProfileDescription(profile: SCurveProfile): string {
  const descriptions: Record<SCurveProfile, string> = {
    LINEAR: 'Equal distribution across all periods',
    FRONT_LOADED: '60% in first half, 40% in second half',
    BACK_LOADED: '40% in first half, 60% in second half',
    BELL_CURVE: 'Normal distribution - peaks in middle, tapers at ends',
    CUSTOM: 'Custom distribution curve'
  };

  return descriptions[profile] || 'Unknown profile';
}

/**
 * Calculate percentage complete at a given period
 *
 * @param currentPeriod - Current period
 * @param startPeriod - Start period of item
 * @param duration - Duration of item
 * @param profile - S-curve profile
 * @returns Percentage complete (0-1)
 */
export function calculatePercentComplete(
  currentPeriod: number,
  startPeriod: number,
  duration: number,
  profile: SCurveProfile = 'LINEAR'
): number {
  if (currentPeriod < startPeriod) return 0;
  if (currentPeriod >= startPeriod + duration) return 1;

  const allocations = generateSCurveAllocation(1, duration, profile);
  const periodsElapsed = currentPeriod - startPeriod + 1;

  const percentComplete = allocations
    .slice(0, periodsElapsed)
    .reduce((sum, alloc) => sum + alloc.percentage, 0);

  return Math.min(1, percentComplete);
}

/**
 * Reverse calculation: Given a target percentage, find the period
 *
 * @param targetPercentage - Target percentage complete (0-1)
 * @param startPeriod - Start period
 * @param duration - Duration
 * @param profile - S-curve profile
 * @returns Period number where target percentage is reached
 */
export function findPeriodForPercentage(
  targetPercentage: number,
  startPeriod: number,
  duration: number,
  profile: SCurveProfile = 'LINEAR'
): number {
  const allocations = calculateCumulativeAllocation(
    generateSCurveAllocation(1, duration, profile)
  );

  for (const alloc of allocations) {
    if (alloc.cumulative_percentage >= targetPercentage) {
      return startPeriod + alloc.period_offset;
    }
  }

  return startPeriod + duration;
}
