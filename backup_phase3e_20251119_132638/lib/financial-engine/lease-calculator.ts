// Lease Calculator – Revenue Computation Engine
// Version: v1.0 (2025-10-13)
//
// Calculates lease revenue across periods including:
// - Base rent with escalations
// - Free rent adjustments
// - Percentage rent (retail)
// - Expense recoveries

/**
 * Lease data structure from tbl_rent_roll
 */
export interface Lease {
  rent_roll_id: number;
  project_id: number;
  tenant_name: string;
  space_type: 'OFFICE' | 'RETAIL' | 'INDUSTRIAL' | 'MEDICAL' | 'FLEX' | 'OTHER';

  lease_start_date: Date | string;
  lease_end_date: Date | string;
  lease_term_months: number;

  leased_sf: number;
  base_rent_psf_annual: number;

  escalation_type: 'NONE' | 'FIXED_DOLLAR' | 'FIXED_PERCENT' | 'CPI' | 'STEPPED';
  escalation_value?: number;
  escalation_frequency_months: number;

  recovery_structure: 'GROSS' | 'NNN' | 'MODIFIED_GROSS' | 'INDUSTRIAL_GROSS';
  cam_recovery_rate: number;
  tax_recovery_rate: number;
  insurance_recovery_rate: number;

  free_rent_months: number;
  free_rent_start_month: number;
  rent_abatement_amount: number;

  has_percentage_rent: boolean;
  percentage_rent_rate?: number;
  percentage_rent_breakpoint?: number;
}

/**
 * Escalation schedule segment
 */
export interface EscalationSegment {
  start_month: number;
  end_month: number;
  base_rent_psf: number;
  escalation_factor: number;
  effective_rent_psf: number;
}

/**
 * Lease revenue for a single period
 */
export interface LeaseRevenuePeriod {
  period_id: number;
  lease_id: number;
  base_rent: number;
  escalated_rent: number;
  percentage_rent: number;
  cam_recovery: number;
  tax_recovery: number;
  insurance_recovery: number;
  vacancy_loss: number;
  free_rent_adjustment: number;
  effective_gross_rent: number;
}

/**
 * Build escalation schedule for the lease term
 * Returns array of segments with escalated rents
 */
export function buildEscalationSchedule(lease: Lease): EscalationSegment[] {
  const segments: EscalationSegment[] = [];

  const totalMonths = lease.lease_term_months;
  const escFreq = lease.escalation_frequency_months || 12;

  let currentRentPsf = lease.base_rent_psf_annual;
  let currentMonth = 0;

  while (currentMonth < totalMonths) {
    const segmentEnd = Math.min(currentMonth + escFreq, totalMonths);

    segments.push({
      start_month: currentMonth,
      end_month: segmentEnd,
      base_rent_psf: lease.base_rent_psf_annual,
      escalation_factor: currentMonth === 0 ? 1.0 : calculateEscalationFactor(lease, currentMonth),
      effective_rent_psf: currentRentPsf
    });

    // Apply escalation for next segment
    if (segmentEnd < totalMonths) {
      currentRentPsf = applyEscalation(currentRentPsf, lease);
    }

    currentMonth = segmentEnd;
  }

  return segments;
}

/**
 * Calculate escalation factor at a given month
 */
function calculateEscalationFactor(lease: Lease, month: number): number {
  const numEscalations = Math.floor(month / lease.escalation_frequency_months);

  if (lease.escalation_type === 'FIXED_PERCENT' && lease.escalation_value) {
    return Math.pow(1 + lease.escalation_value, numEscalations);
  }

  if (lease.escalation_type === 'FIXED_DOLLAR' && lease.escalation_value) {
    return 1 + (lease.escalation_value * numEscalations) / lease.base_rent_psf_annual;
  }

  if (lease.escalation_type === 'CPI' && lease.escalation_value) {
    // CPI escalation - use value as annual CPI rate
    return Math.pow(1 + lease.escalation_value, numEscalations);
  }

  return 1.0;
}

/**
 * Apply escalation to current rent
 */
function applyEscalation(currentRent: number, lease: Lease): number {
  if (lease.escalation_type === 'NONE') {
    return currentRent;
  }

  if (lease.escalation_type === 'FIXED_PERCENT' && lease.escalation_value) {
    return currentRent * (1 + lease.escalation_value);
  }

  if (lease.escalation_type === 'FIXED_DOLLAR' && lease.escalation_value) {
    return currentRent + lease.escalation_value;
  }

  if (lease.escalation_type === 'CPI' && lease.escalation_value) {
    return currentRent * (1 + lease.escalation_value);
  }

  return currentRent;
}

/**
 * Calculate rent for a specific period
 *
 * @param lease - Lease data
 * @param period - Period number (0-based from project start)
 * @param schedule - Pre-built escalation schedule
 * @param leaseStartPeriod - Period when lease starts (from project start)
 * @returns Rent amount for the period
 */
export function calculateRentForPeriod(
  lease: Lease,
  period: number,
  schedule: EscalationSegment[],
  leaseStartPeriod: number
): { base_rent: number; escalated_rent: number } {
  // Calculate month within lease term
  const monthInLease = period - leaseStartPeriod;

  // Check if period is within lease term
  if (monthInLease < 0 || monthInLease >= lease.lease_term_months) {
    return { base_rent: 0, escalated_rent: 0 };
  }

  // Find applicable segment
  const segment = schedule.find(
    s => monthInLease >= s.start_month && monthInLease < s.end_month
  );

  if (!segment) {
    return { base_rent: 0, escalated_rent: 0 };
  }

  // Calculate monthly rent
  const baseRentAnnual = lease.base_rent_psf_annual * lease.leased_sf;
  const escalatedRentAnnual = segment.effective_rent_psf * lease.leased_sf;

  const baseRentMonthly = baseRentAnnual / 12;
  const escalatedRentMonthly = escalatedRentAnnual / 12;

  return {
    base_rent: baseRentMonthly,
    escalated_rent: escalatedRentMonthly
  };
}

/**
 * Calculate free rent adjustment for a period
 * Returns negative amount if period is within free rent window
 *
 * @param lease - Lease data
 * @param period - Period number
 * @param leaseStartPeriod - Period when lease starts
 * @returns Free rent adjustment (0 or negative)
 */
export function calculateFreeRentAdjustment(
  lease: Lease,
  period: number,
  leaseStartPeriod: number
): number {
  const monthInLease = period - leaseStartPeriod;

  // Check if this period is within free rent window
  const freeRentStart = lease.free_rent_start_month - 1; // Convert to 0-based
  const freeRentEnd = freeRentStart + lease.free_rent_months;

  if (monthInLease >= freeRentStart && monthInLease < freeRentEnd) {
    // Full rent abatement
    const baseRentAnnual = lease.base_rent_psf_annual * lease.leased_sf;
    const baseRentMonthly = baseRentAnnual / 12;
    return -baseRentMonthly;
  }

  // Check for partial abatement
  if (lease.rent_abatement_amount > 0) {
    // Spread abatement over free rent months
    if (monthInLease >= freeRentStart && monthInLease < freeRentEnd) {
      return -(lease.rent_abatement_amount / lease.free_rent_months);
    }
  }

  return 0;
}

/**
 * Calculate percentage rent (retail overage)
 *
 * @param lease - Lease data
 * @param periodSales - Tenant sales for the period
 * @returns Percentage rent amount
 */
export function calculatePercentageRent(
  lease: Lease,
  periodSales: number
): number {
  if (!lease.has_percentage_rent) {
    return 0;
  }

  if (!lease.percentage_rent_rate || !lease.percentage_rent_breakpoint) {
    return 0;
  }

  // Calculate overage
  const overage = Math.max(0, periodSales - lease.percentage_rent_breakpoint);

  // Apply percentage to overage
  return overage * lease.percentage_rent_rate;
}

/**
 * Calculate expense recoveries for a period
 *
 * @param lease - Lease data
 * @param period - Period number
 * @param camExpense - CAM expense for the period
 * @param taxExpense - Tax expense for the period
 * @param insuranceExpense - Insurance expense for the period
 * @returns Recovery amounts
 */
export function calculateRecoveries(
  lease: Lease,
  period: number,
  camExpense: number,
  taxExpense: number,
  insuranceExpense: number
): {
  cam_recovery: number;
  tax_recovery: number;
  insurance_recovery: number;
} {
  // No recoveries for GROSS leases
  if (lease.recovery_structure === 'GROSS') {
    return {
      cam_recovery: 0,
      tax_recovery: 0,
      insurance_recovery: 0
    };
  }

  // Full recoveries for NNN
  if (lease.recovery_structure === 'NNN') {
    return {
      cam_recovery: camExpense * lease.cam_recovery_rate,
      tax_recovery: taxExpense * lease.tax_recovery_rate,
      insurance_recovery: insuranceExpense * lease.insurance_recovery_rate
    };
  }

  // Modified Gross - typically CAM only
  if (lease.recovery_structure === 'MODIFIED_GROSS') {
    return {
      cam_recovery: camExpense * lease.cam_recovery_rate,
      tax_recovery: 0,
      insurance_recovery: 0
    };
  }

  // Industrial Gross - typically taxes and insurance only
  if (lease.recovery_structure === 'INDUSTRIAL_GROSS') {
    return {
      cam_recovery: 0,
      tax_recovery: taxExpense * lease.tax_recovery_rate,
      insurance_recovery: insuranceExpense * lease.insurance_recovery_rate
    };
  }

  return {
    cam_recovery: 0,
    tax_recovery: 0,
    insurance_recovery: 0
  };
}

/**
 * Calculate complete lease revenue for a period
 * Main function that combines all components
 *
 * @param lease - Lease data
 * @param period - Period number
 * @param leaseStartPeriod - Period when lease starts
 * @param schedule - Pre-built escalation schedule
 * @param expenses - Period expenses for recovery calculation
 * @param periodSales - Tenant sales (for percentage rent)
 * @returns Complete revenue breakdown
 */
export function calculateLeaseRevenueForPeriod(
  lease: Lease,
  period: number,
  leaseStartPeriod: number,
  schedule: EscalationSegment[],
  expenses?: {
    cam: number;
    tax: number;
    insurance: number;
  },
  periodSales?: number
): LeaseRevenuePeriod {
  // Calculate base and escalated rent
  const { base_rent, escalated_rent } = calculateRentForPeriod(
    lease,
    period,
    schedule,
    leaseStartPeriod
  );

  // Calculate free rent adjustment
  const free_rent_adjustment = calculateFreeRentAdjustment(
    lease,
    period,
    leaseStartPeriod
  );

  // Calculate percentage rent
  const percentage_rent = periodSales
    ? calculatePercentageRent(lease, periodSales)
    : 0;

  // Calculate recoveries
  const recoveries = expenses
    ? calculateRecoveries(
        lease,
        period,
        expenses.cam,
        expenses.tax,
        expenses.insurance
      )
    : { cam_recovery: 0, tax_recovery: 0, insurance_recovery: 0 };

  // Calculate effective gross rent
  const effective_gross_rent =
    escalated_rent +
    free_rent_adjustment +
    percentage_rent +
    recoveries.cam_recovery +
    recoveries.tax_recovery +
    recoveries.insurance_recovery;

  return {
    period_id: period,
    lease_id: lease.rent_roll_id,
    base_rent,
    escalated_rent,
    percentage_rent,
    cam_recovery: recoveries.cam_recovery,
    tax_recovery: recoveries.tax_recovery,
    insurance_recovery: recoveries.insurance_recovery,
    vacancy_loss: 0, // Calculated separately in rollover logic
    free_rent_adjustment,
    effective_gross_rent
  };
}

/**
 * Calculate revenue for entire lease term
 *
 * @param lease - Lease data
 * @param leaseStartPeriod - Period when lease starts
 * @param leaseEndPeriod - Period when lease ends
 * @param expensesByPeriod - Map of period to expenses
 * @param salesByPeriod - Map of period to sales (for percentage rent)
 * @returns Array of revenue periods
 */
export function calculateLeaseRevenue(
  lease: Lease,
  leaseStartPeriod: number,
  leaseEndPeriod: number,
  expensesByPeriod?: Map<number, { cam: number; tax: number; insurance: number }>,
  salesByPeriod?: Map<number, number>
): LeaseRevenuePeriod[] {
  const schedule = buildEscalationSchedule(lease);
  const results: LeaseRevenuePeriod[] = [];

  for (let period = leaseStartPeriod; period <= leaseEndPeriod; period++) {
    const expenses = expensesByPeriod?.get(period);
    const sales = salesByPeriod?.get(period);

    const revenue = calculateLeaseRevenueForPeriod(
      lease,
      period,
      leaseStartPeriod,
      schedule,
      expenses,
      sales
    );

    results.push(revenue);
  }

  return results;
}

/**
 * Validate lease data before calculation
 */
export function validateLease(lease: Lease): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (lease.leased_sf <= 0) {
    errors.push('Leased SF must be positive');
  }

  if (lease.base_rent_psf_annual < 0) {
    errors.push('Base rent PSF cannot be negative');
  }

  if (lease.lease_term_months <= 0) {
    errors.push('Lease term must be positive');
  }

  if (lease.free_rent_months < 0) {
    errors.push('Free rent months cannot be negative');
  }

  if (lease.free_rent_months > lease.lease_term_months) {
    errors.push('Free rent months cannot exceed lease term');
  }

  if (lease.escalation_type !== 'NONE' && !lease.escalation_value) {
    errors.push('Escalation value required for escalation type');
  }

  if (lease.has_percentage_rent) {
    if (!lease.percentage_rent_rate || !lease.percentage_rent_breakpoint) {
      errors.push('Percentage rent rate and breakpoint required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
