/**
 * Timing & Distribution Calculation Utilities
 *
 * Provides functions for:
 * - Converting Napkin period offsets to actual dates
 * - Generating distribution curves (even, S-curve, front/back-loaded)
 * - Calculating escalated amounts with compound interest
 */

import { addMonths, differenceInMonths, differenceInYears, format } from 'date-fns';

export interface DistributionPeriod {
  period: string;       // "Jan 2025"
  periodNumber: number; // Period number (1, 2, 3...)
  amount: number;       // Dollar amount
  percent: number;      // Percentage of total (0-100)
}

/**
 * Calculate actual date from project start + period offset
 *
 * @param projectStartDate - Project start date (ISO string)
 * @param periodOffset - Number of months from project start
 * @returns Calculated date
 */
export function calculateDateFromPeriod(
  projectStartDate: string,
  periodOffset: number
): Date {
  return addMonths(new Date(projectStartDate), periodOffset);
}

/**
 * Generate distribution array for visualization and calculation
 *
 * @param totalAmount - Total budget amount to distribute
 * @param startDate - Work start date (ISO string)
 * @param endDate - Work end date (ISO string)
 * @param method - Distribution method
 * @param curveProfile - S-curve profile type (if method='curve')
 * @param curveSteepness - Curve intensity 0-100 (if method='curve')
 * @param projectStartDate - Project start date (ISO string) - used to calculate period offset
 * @returns Array of period-by-period distributions
 */
export function calculateDistribution(
  totalAmount: number,
  startDate: string,
  endDate: string,
  method: 'even' | 'curve' | 'milestone' = 'even',
  curveProfile?: 'standard' | 'front_loaded' | 'back_loaded',
  curveSteepness: number = 25,
  projectStartDate?: string
): DistributionPeriod[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = differenceInMonths(end, start) + 1;

  if (months <= 0) {
    return [];
  }

  // Calculate period offset from project start
  let periodOffset = 0;
  if (projectStartDate) {
    const projectStart = new Date(projectStartDate);
    periodOffset = differenceInMonths(start, projectStart);
  }

  let distribution: number[];

  if (method === 'even' || method === 'milestone') {
    // Linear distribution
    distribution = Array(months).fill(1 / months);
  } else {
    // S-curve distribution
    distribution = generateSCurve(months, curveProfile || 'standard', curveSteepness);
  }

  // Normalize to ensure sum = 100%
  const sum = distribution.reduce((a, b) => a + b, 0);
  const normalized = distribution.map(v => v / sum);

  // Convert to output format
  return normalized.map((percent, i) => ({
    period: format(addMonths(start, i), 'MMM yyyy'),
    periodNumber: periodOffset + i + 1, // Add offset so periods align with project timeline
    amount: totalAmount * percent,
    percent: percent * 100
  }));
}

/**
 * Generate S-curve distribution using sigmoid function
 *
 * @param periods - Number of periods
 * @param profile - Curve profile type
 * @param steepness - Curve intensity 0-100 (50 = default)
 * @returns Array of percentages (not normalized)
 */
function generateSCurve(
  periods: number,
  profile: 'standard' | 'front_loaded' | 'back_loaded',
  steepness: number
): number[] {
  const values: number[] = [];

  // Map steepness (0-100) to sigmoid k parameter for reasonable curves
  // Lower values = gentler curve, higher values = steeper curve
  // Scale: 25 (gentle) -> 0.3, 50 (standard) -> 0.5, 75+ (aggressive) -> 0.8+
  const k = 0.2 + (steepness / 100) * 0.8;

  // Midpoint adjustment for front/back loading
  let midpointShift = 0;
  if (profile === 'front_loaded') {
    midpointShift = -periods * 0.15; // Shift curve earlier
  } else if (profile === 'back_loaded') {
    midpointShift = periods * 0.15;  // Shift curve later
  }

  const midpoint = (periods - 1) / 2 + midpointShift;

  // Generate sigmoid cumulative distribution
  const cumulativeValues: number[] = [];
  for (let i = 0; i < periods; i++) {
    const x = i;
    const sigmoid = 1 / (1 + Math.exp(-k * (x - midpoint)));
    cumulativeValues.push(sigmoid);
  }

  // Convert cumulative to incremental (derivative)
  for (let i = 0; i < periods; i++) {
    if (i === 0) {
      values.push(cumulativeValues[i]);
    } else {
      values.push(cumulativeValues[i] - cumulativeValues[i - 1]);
    }
  }

  return values;
}

/**
 * Apply escalation to base amount using compound interest
 *
 * @param baseAmount - Original amount before escalation
 * @param escalationRate - Annual escalation rate (as percentage, e.g., 3.5)
 * @param escalationMethod - How escalation is applied
 * @param workStartDate - When work begins (ISO string)
 * @param workEndDate - When work ends (ISO string)
 * @param referenceDate - Reference date for escalation (default: project start)
 * @returns Escalated amount
 */
export function calculateEscalatedAmount(
  baseAmount: number,
  escalationRate: number,
  escalationMethod: 'to_start' | 'through_duration',
  workStartDate: string,
  workEndDate: string,
  referenceDate: string
): number {
  if (!escalationRate || escalationRate === 0) {
    return baseAmount;
  }

  const rate = escalationRate / 100; // Convert percentage to decimal
  const refDate = new Date(referenceDate);
  const startDate = new Date(workStartDate);
  const endDate = new Date(workEndDate);

  if (escalationMethod === 'to_start') {
    // Escalate from reference date to work start date
    const years = differenceInYears(startDate, refDate);
    return baseAmount * Math.pow(1 + rate, years);
  } else {
    // Escalate throughout duration (midpoint approach)
    const yearsToStart = differenceInYears(startDate, refDate);
    const duration = differenceInYears(endDate, startDate);
    const avgYears = yearsToStart + (duration / 2);
    return baseAmount * Math.pow(1 + rate, avgYears);
  }
}

/**
 * Calculate total duration in months
 */
export function calculateDurationMonths(startDate: string, endDate: string): number {
  return differenceInMonths(new Date(endDate), new Date(startDate)) + 1;
}

/**
 * Format money for display
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
