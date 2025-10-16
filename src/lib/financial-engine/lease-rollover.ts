// Lease Rollover Engine – Renewal vs Re-lease Decision Logic
// Version: v1.0 (2025-10-13)
//
// Handles lease expiration scenarios:
// - Renewal probability analysis
// - Re-lease with downtime
// - TI/LC cost allocation
// - Mark-to-market rent adjustments

import type { Lease } from './lease-calculator';

/**
 * Lease assumptions from tbl_lease_assumptions
 */
export interface LeaseAssumptions {
  assumption_id: number;
  project_id: number;
  space_type: 'OFFICE' | 'RETAIL' | 'INDUSTRIAL' | 'MEDICAL' | 'FLEX' | 'OTHER';

  market_rent_psf_annual: number;
  market_rent_growth_rate: number;

  renewal_probability: number;
  downtime_months: number;

  ti_psf_renewal: number;
  ti_psf_new_tenant: number;
  lc_psf_renewal: number;
  lc_psf_new_tenant: number;

  free_rent_months_renewal: number;
  free_rent_months_new_tenant: number;
}

/**
 * Rollover decision outcome
 */
export interface RolloverDecision {
  decision_type: 'RENEWAL' | 'RELEASE' | 'VACANCY';

  // New lease terms
  new_rent_psf: number;
  new_lease_term_months: number;
  new_start_period: number;

  // Costs
  ti_cost: number;
  lc_cost: number;
  total_rollover_cost: number;

  // Adjustments
  free_rent_months: number;
  downtime_periods: number;
  vacancy_loss: number;

  // Analysis
  mark_to_market_psf: number;
  mark_to_market_total: number;

  probability_used: number;
}

/**
 * Generate rollover decision based on assumptions and probabilities
 *
 * @param lease - Original expiring lease
 * @param assumptions - Market assumptions for space type
 * @param expirationPeriod - Period when lease expires
 * @param forceDecision - Optional: force RENEWAL or RELEASE (for scenario analysis)
 * @returns Rollover decision with costs and new terms
 */
export function generateRolloverDecision(
  lease: Lease,
  assumptions: LeaseAssumptions,
  expirationPeriod: number,
  forceDecision?: 'RENEWAL' | 'RELEASE'
): RolloverDecision {
  // Determine renewal vs re-lease
  const isRenewal = forceDecision === 'RENEWAL'
    ? true
    : forceDecision === 'RELEASE'
    ? false
    : Math.random() < assumptions.renewal_probability;

  // Calculate market rent at expiration (with growth)
  const yearsToExpiration = expirationPeriod / 12;
  const growthFactor = Math.pow(1 + assumptions.market_rent_growth_rate, yearsToExpiration);
  const marketRentAtExpiration = assumptions.market_rent_psf_annual * growthFactor;

  // Calculate mark-to-market
  const markToMarketPsf = marketRentAtExpiration - lease.base_rent_psf_annual;
  const markToMarketTotal = markToMarketPsf * lease.leased_sf;

  let decision: RolloverDecision;

  if (isRenewal) {
    // RENEWAL scenario
    decision = {
      decision_type: 'RENEWAL',
      new_rent_psf: marketRentAtExpiration, // Renew at market
      new_lease_term_months: lease.lease_term_months, // Same term
      new_start_period: expirationPeriod, // Immediate start

      ti_cost: assumptions.ti_psf_renewal * lease.leased_sf,
      lc_cost: assumptions.lc_psf_renewal * lease.leased_sf,
      total_rollover_cost:
        (assumptions.ti_psf_renewal + assumptions.lc_psf_renewal) * lease.leased_sf,

      free_rent_months: assumptions.free_rent_months_renewal,
      downtime_periods: 0, // No downtime for renewal
      vacancy_loss: 0,

      mark_to_market_psf: markToMarketPsf,
      mark_to_market_total: markToMarketTotal,

      probability_used: assumptions.renewal_probability
    };
  } else {
    // RE-LEASE scenario (new tenant)
    const downtimeMonths = assumptions.downtime_months;
    const vacancyLoss = (downtimeMonths / 12) * marketRentAtExpiration * lease.leased_sf;

    decision = {
      decision_type: 'RELEASE',
      new_rent_psf: marketRentAtExpiration,
      new_lease_term_months: lease.lease_term_months, // Assume same term for new tenant
      new_start_period: expirationPeriod + downtimeMonths, // After downtime

      ti_cost: assumptions.ti_psf_new_tenant * lease.leased_sf,
      lc_cost: assumptions.lc_psf_new_tenant * lease.leased_sf,
      total_rollover_cost:
        (assumptions.ti_psf_new_tenant + assumptions.lc_psf_new_tenant) * lease.leased_sf,

      free_rent_months: assumptions.free_rent_months_new_tenant,
      downtime_periods: downtimeMonths,
      vacancy_loss: vacancyLoss,

      mark_to_market_psf: markToMarketPsf,
      mark_to_market_total: markToMarketTotal,

      probability_used: 1 - assumptions.renewal_probability
    };
  }

  return decision;
}

/**
 * Apply rollover decision to create new lease record
 *
 * @param decision - Rollover decision from generateRolloverDecision
 * @param originalLease - Expiring lease
 * @param newStartPeriod - Period when new lease starts
 * @returns New lease object ready for insertion
 */
export function applyRolloverDecision(
  decision: RolloverDecision,
  originalLease: Lease,
  newStartPeriod: number
): Partial<Lease> {
  // Calculate new dates based on periods
  // Note: In practice, you'd convert periods to dates using project start date

  const newLease: Partial<Lease> = {
    // Keep original identifiers
    project_id: originalLease.project_id,
    space_type: originalLease.space_type,
    leased_sf: originalLease.leased_sf,

    // New lease terms
    tenant_name: decision.decision_type === 'RENEWAL'
      ? originalLease.tenant_name
      : `New Tenant (${originalLease.space_type})`,

    base_rent_psf_annual: decision.new_rent_psf,
    lease_term_months: decision.new_lease_term_months,

    // Preserve original escalation structure
    escalation_type: originalLease.escalation_type,
    escalation_value: originalLease.escalation_value,
    escalation_frequency_months: originalLease.escalation_frequency_months,

    // Preserve recovery structure
    recovery_structure: originalLease.recovery_structure,
    cam_recovery_rate: originalLease.cam_recovery_rate,
    tax_recovery_rate: originalLease.tax_recovery_rate,
    insurance_recovery_rate: originalLease.insurance_recovery_rate,

    // Apply rollover concessions
    free_rent_months: decision.free_rent_months,
    free_rent_start_month: 1, // Start immediately
    rent_abatement_amount: 0,

    // TI/LC from decision
    ti_allowance_psf: decision.ti_cost / originalLease.leased_sf,
    lc_allowance_psf: decision.lc_cost / originalLease.leased_sf,

    // Reset percentage rent (if applicable)
    has_percentage_rent: originalLease.has_percentage_rent,
    percentage_rent_rate: originalLease.percentage_rent_rate,
    percentage_rent_breakpoint: originalLease.percentage_rent_breakpoint,

    // Status
    lease_status: 'ACTIVE'
  };

  return newLease;
}

/**
 * Calculate expected rollover cost (probability-weighted)
 *
 * @param lease - Lease to analyze
 * @param assumptions - Market assumptions
 * @returns Expected cost considering both renewal and re-lease scenarios
 */
export function calculateExpectedRolloverCost(
  lease: Lease,
  assumptions: LeaseAssumptions
): {
  expected_ti_cost: number;
  expected_lc_cost: number;
  expected_total_cost: number;
  expected_vacancy_loss: number;
  expected_downtime_months: number;
} {
  const renewalProb = assumptions.renewal_probability;
  const releaseProb = 1 - renewalProb;

  // Renewal scenario costs
  const renewalTiCost = assumptions.ti_psf_renewal * lease.leased_sf;
  const renewalLcCost = assumptions.lc_psf_renewal * lease.leased_sf;

  // Re-lease scenario costs
  const releaseTiCost = assumptions.ti_psf_new_tenant * lease.leased_sf;
  const releaseLcCost = assumptions.lc_psf_new_tenant * lease.leased_sf;

  // Vacancy loss (only in re-lease scenario)
  const vacancyLoss =
    (assumptions.downtime_months / 12) *
    assumptions.market_rent_psf_annual *
    lease.leased_sf;

  // Expected values
  return {
    expected_ti_cost: renewalProb * renewalTiCost + releaseProb * releaseTiCost,
    expected_lc_cost: renewalProb * renewalLcCost + releaseProb * releaseLcCost,
    expected_total_cost:
      renewalProb * (renewalTiCost + renewalLcCost) +
      releaseProb * (releaseTiCost + releaseLcCost),
    expected_vacancy_loss: releaseProb * vacancyLoss,
    expected_downtime_months: releaseProb * assumptions.downtime_months
  };
}

/**
 * Analyze lease expiration scenario
 *
 * @param lease - Lease to analyze
 * @param assumptions - Market assumptions
 * @param expirationPeriod - Period when lease expires
 * @returns Both renewal and re-lease scenarios for comparison
 */
export function analyzeRolloverScenarios(
  lease: Lease,
  assumptions: LeaseAssumptions,
  expirationPeriod: number
): {
  renewal: RolloverDecision;
  release: RolloverDecision;
  expected: ReturnType<typeof calculateExpectedRolloverCost>;
} {
  const renewalScenario = generateRolloverDecision(
    lease,
    assumptions,
    expirationPeriod,
    'RENEWAL'
  );

  const releaseScenario = generateRolloverDecision(
    lease,
    assumptions,
    expirationPeriod,
    'RELEASE'
  );

  const expectedCosts = calculateExpectedRolloverCost(lease, assumptions);

  return {
    renewal: renewalScenario,
    release: releaseScenario,
    expected: expectedCosts
  };
}

/**
 * Calculate lease economics summary
 *
 * @param lease - Lease data
 * @param assumptions - Market assumptions
 * @returns Economic metrics
 */
export function calculateLeaseEconomics(
  lease: Lease,
  assumptions: LeaseAssumptions
): {
  current_annual_rent: number;
  market_annual_rent: number;
  mark_to_market_dollar: number;
  mark_to_market_percent: number;
  lease_value: number;
} {
  const currentAnnualRent = lease.base_rent_psf_annual * lease.leased_sf;
  const marketAnnualRent = assumptions.market_rent_psf_annual * lease.leased_sf;
  const markToMarketDollar = marketAnnualRent - currentAnnualRent;
  const markToMarketPercent =
    currentAnnualRent > 0
      ? (markToMarketDollar / currentAnnualRent) * 100
      : 0;

  // Simple lease value = annual rent * remaining years
  const remainingYears = lease.lease_term_months / 12;
  const leaseValue = currentAnnualRent * remainingYears;

  return {
    current_annual_rent: currentAnnualRent,
    market_annual_rent: marketAnnualRent,
    mark_to_market_dollar: markToMarketDollar,
    mark_to_market_percent: markToMarketPercent,
    lease_value: leaseValue
  };
}

/**
 * Validate rollover assumptions
 */
export function validateAssumptions(
  assumptions: LeaseAssumptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (assumptions.market_rent_psf_annual <= 0) {
    errors.push('Market rent must be positive');
  }

  if (assumptions.renewal_probability < 0 || assumptions.renewal_probability > 1) {
    errors.push('Renewal probability must be between 0 and 1');
  }

  if (assumptions.downtime_months < 0) {
    errors.push('Downtime months cannot be negative');
  }

  if (assumptions.ti_psf_renewal < 0 || assumptions.ti_psf_new_tenant < 0) {
    errors.push('TI costs cannot be negative');
  }

  if (assumptions.lc_psf_renewal < 0 || assumptions.lc_psf_new_tenant < 0) {
    errors.push('LC costs cannot be negative');
  }

  if (assumptions.free_rent_months_renewal < 0 || assumptions.free_rent_months_new_tenant < 0) {
    errors.push('Free rent months cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate capital reserve items for lease rollover
 *
 * @param decision - Rollover decision
 * @param lease - Original lease
 * @param expirationPeriod - Period when lease expires
 * @returns Capital reserve items for TI and LC
 */
export function generateCapitalReserves(
  decision: RolloverDecision,
  lease: Lease,
  expirationPeriod: number
): Array<{
  reserve_type: 'TI' | 'LC';
  reserve_name: string;
  trigger_type: 'LEASE_EXPIRATION';
  trigger_period: number;
  amount: number;
  amount_per_sf: number;
}> {
  const reserves = [];

  if (decision.ti_cost > 0) {
    reserves.push({
      reserve_type: 'TI' as const,
      reserve_name: `TI - ${lease.tenant_name} ${decision.decision_type}`,
      trigger_type: 'LEASE_EXPIRATION' as const,
      trigger_period: expirationPeriod,
      amount: decision.ti_cost,
      amount_per_sf: decision.ti_cost / lease.leased_sf
    });
  }

  if (decision.lc_cost > 0) {
    reserves.push({
      reserve_type: 'LC' as const,
      reserve_name: `LC - ${lease.tenant_name} ${decision.decision_type}`,
      trigger_type: 'LEASE_EXPIRATION' as const,
      trigger_period: expirationPeriod,
      amount: decision.lc_cost,
      amount_per_sf: decision.lc_cost / lease.leased_sf
    });
  }

  return reserves;
}
