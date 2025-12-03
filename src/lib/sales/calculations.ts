/**
 * Sales Calculation Utilities
 * Frontend versions of price escalation and net proceeds calculations
 * Should match backend logic in backend/apps/sales_absorption/utils.py
 */

/**
 * Calculate inflated price using monthly compounding (matches Excel FV function)
 *
 * Formula: inflated_price = base_price × (1 + monthly_rate) ^ months_elapsed
 * Where monthly_rate = annual_rate / 12
 *
 * This matches Excel's FV function: =FV(rate/12, nper, 0, -pv)
 * and the backend calculation in backend/apps/sales_absorption/utils.py
 *
 * @param basePrice - Original price per unit at baseDate
 * @param growthRate - Annual growth rate (e.g., 0.03 for 3%)
 * @param baseDate - Date when basePrice was established
 * @param closingDate - Date to calculate inflated price for
 * @returns Inflated price per unit rounded to 2 decimal places
 */
export function calculateInflatedPrice(
  basePrice: number,
  growthRate: number,
  baseDate: Date,
  closingDate: Date
): number {
  if (basePrice <= 0) {
    return 0;
  }

  if (growthRate === 0) {
    return Math.round(basePrice * 100) / 100;
  }

  // Calculate months elapsed
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = (closingDate.getTime() - baseDate.getTime()) / msPerDay;
  const monthsElapsed = daysElapsed / 30.4375; // Average days per month

  // Apply monthly compound growth: price × (1 + monthly_rate) ^ months
  const monthlyRate = growthRate / 12;
  const multiplier = Math.pow(1 + monthlyRate, monthsElapsed);
  const inflated = basePrice * multiplier;

  return Math.round(inflated * 100) / 100;
}

/**
 * Calculate inflated price from sale period (more accurate)
 *
 * Uses exact monthly periods instead of calculating from dates.
 * Matches Excel's FV function: =FV(rate/12, periods, 0, -pv)
 *
 * @param basePrice - Original price per unit
 * @param growthRate - Annual growth rate (e.g., 0.03 for 3%)
 * @param periods - Number of months from base to sale
 * @returns Inflated price per unit rounded to 2 decimal places
 */
export function calculateInflatedPriceFromPeriods(
  basePrice: number,
  growthRate: number,
  periods: number
): number {
  if (basePrice <= 0) {
    return 0;
  }

  if (growthRate === 0 || periods === 0) {
    return Math.round(basePrice * 100) / 100;
  }

  // Apply monthly compound growth: price × (1 + monthly_rate) ^ periods
  const monthlyRate = growthRate / 12;
  const multiplier = Math.pow(1 + monthlyRate, periods);
  const inflated = basePrice * multiplier;

  return Math.round(inflated * 100) / 100;
}

/**
 * Calculate gross sale value
 *
 * Formula: gross_value = units_closing × price_per_unit
 *
 * @param unitsClosing - Number of units being sold
 * @param pricePerUnit - Price per unit (may be inflated)
 * @returns Gross value rounded to 2 decimal places
 */
export function calculateGrossValue(
  unitsClosing: number,
  pricePerUnit: number
): number {
  if (unitsClosing <= 0 || pricePerUnit <= 0) {
    return 0;
  }

  const gross = unitsClosing * pricePerUnit;
  return Math.round(gross * 100) / 100;
}

/**
 * Calculate net proceeds after all deductions
 *
 * Calculation order:
 * 1. Gross Value (input)
 * 2. Less: Onsite Costs = gross_value × (onsite_cost_pct / 100)
 * 3. Net Price (Parcel Revenue) = gross_value - onsite_costs
 * 4. Less: Commission = net_price × (commission_pct / 100)
 * 5. Less: Closing Costs = net_price × (closing_cost_pct / 100)
 * 6. Net Proceeds = net_price - commission - closing_costs
 *
 * @param grossValue - Gross sale value
 * @param unitsClosing - Number of units closing (not used, kept for compatibility)
 * @param onsiteCostPct - Onsite improvement cost % (e.g., 50.77 = 50.77%)
 * @param commissionPct - Commission % of Net Sale Price (e.g., 3.0 = 3%)
 * @param closingCostPct - Closing cost % of Net Sale Price (e.g., 1.75 = 1.75%)
 * @returns Object with netProceeds and breakdown of all deductions
 */
export function calculateNetProceeds(
  grossValue: number,
  unitsClosing: number,
  onsiteCostPct: number = 0,
  commissionPct: number = 3.0,
  closingCostPct: number = 1.75
): {
  netProceeds: number;
  onsiteCosts: number;
  netPrice: number;
  commissionAmount: number;
  closingCosts: number;
} {
  // Calculate onsite costs (percent of gross)
  const onsiteCosts = Math.round(grossValue * (onsiteCostPct / 100) * 100) / 100;

  // Calculate net price (Parcel Revenue) after onsite deduction
  const netPrice = grossValue - onsiteCosts;

  // Calculate commission (percent of net_price / Parcel Revenue)
  const commissionAmount = Math.round(netPrice * (commissionPct / 100) * 100) / 100;

  // Calculate closing costs (percent of net_price / Parcel Revenue)
  const closingCosts = Math.round(netPrice * (closingCostPct / 100) * 100) / 100;

  // Calculate final net proceeds
  const netProceeds = Math.round((netPrice - commissionAmount - closingCosts) * 100) / 100;

  return {
    netProceeds,
    onsiteCosts,
    netPrice,
    commissionAmount,
    closingCosts,
  };
}

/**
 * Format date as ISO string (YYYY-MM-DD) for API payloads
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO date string to Date object
 * Handles both date-only strings (YYYY-MM-DD) and full ISO timestamps
 */
export function parseISODate(dateString: string): Date {
  // If already contains time component, use as-is
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  // Otherwise, append time to avoid timezone issues
  return new Date(dateString + 'T00:00:00');
}
