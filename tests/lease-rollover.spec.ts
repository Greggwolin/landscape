// Lease Rollover Unit Tests
// Version: v1.0 (2025-10-13)

import {
  generateRolloverDecision,
  applyRolloverDecision,
  calculateExpectedRolloverCost,
  analyzeRolloverScenarios,
  calculateLeaseEconomics,
  validateAssumptions,
  generateCapitalReserves,
  type LeaseAssumptions,
  type RolloverDecision
} from '@/lib/financial-engine/lease-rollover';
import type { Lease } from '@/lib/financial-engine/lease-calculator';

describe('generateRolloverDecision', () => {
  it('should generate RENEWAL decision when forced', () => {
    const lease = createTestLease();
    const assumptions = createTestAssumptions();

    const decision = generateRolloverDecision(lease, assumptions, 60, 'RENEWAL');

    expect(decision.decision_type).toBe('RENEWAL');
    expect(decision.downtime_periods).toBe(0);
    expect(decision.vacancy_loss).toBe(0);
    expect(decision.ti_cost).toBe(assumptions.ti_psf_renewal * lease.leased_sf);
    expect(decision.lc_cost).toBe(assumptions.lc_psf_renewal * lease.leased_sf);
  });

  it('should generate RELEASE decision when forced', () => {
    const lease = createTestLease();
    const assumptions = createTestAssumptions();

    const decision = generateRolloverDecision(lease, assumptions, 60, 'RELEASE');

    expect(decision.decision_type).toBe('RELEASE');
    expect(decision.downtime_periods).toBe(assumptions.downtime_months);
    expect(decision.vacancy_loss).toBeGreaterThan(0);
    expect(decision.ti_cost).toBe(assumptions.ti_psf_new_tenant * lease.leased_sf);
    expect(decision.lc_cost).toBe(assumptions.lc_psf_new_tenant * lease.leased_sf);
  });

  it('should calculate mark-to-market correctly', () => {
    const lease = createTestLease({
      base_rent_psf_annual: 20
    });
    const assumptions = createTestAssumptions({
      market_rent_psf_annual: 25
    });

    const decision = generateRolloverDecision(lease, assumptions, 60, 'RENEWAL');

    expect(decision.mark_to_market_psf).toBe(5); // $25 - $20
    expect(decision.mark_to_market_total).toBe(50000); // $5 * 10,000 SF
  });

  it('should apply market rent growth', () => {
    const lease = createTestLease({
      base_rent_psf_annual: 20
    });
    const assumptions = createTestAssumptions({
      market_rent_psf_annual: 24,
      market_rent_growth_rate: 0.03 // 3% annual
    });

    // Expiration at 60 months = 5 years
    // Market rent at expiration = 24 * (1.03^5) = ~27.82
    const decision = generateRolloverDecision(lease, assumptions, 60, 'RENEWAL');

    expect(decision.new_rent_psf).toBeCloseTo(27.82, 2);
  });

  it('should calculate vacancy loss for re-lease', () => {
    const lease = createTestLease({
      leased_sf: 10000
    });
    const assumptions = createTestAssumptions({
      market_rent_psf_annual: 24,
      downtime_months: 6
    });

    const decision = generateRolloverDecision(lease, assumptions, 60, 'RELEASE');

    // Expected vacancy loss = (6/12) * $24/SF * 10,000 SF = $120,000
    expect(decision.vacancy_loss).toBeCloseTo(120000, 2);
  });

  it('should use correct free rent months', () => {
    const lease = createTestLease();
    const assumptions = createTestAssumptions({
      free_rent_months_renewal: 1,
      free_rent_months_new_tenant: 3
    });

    const renewalDecision = generateRolloverDecision(lease, assumptions, 60, 'RENEWAL');
    const releaseDecision = generateRolloverDecision(lease, assumptions, 60, 'RELEASE');

    expect(renewalDecision.free_rent_months).toBe(1);
    expect(releaseDecision.free_rent_months).toBe(3);
  });
});

describe('calculateExpectedRolloverCost', () => {
  it('should calculate probability-weighted costs', () => {
    const lease = createTestLease({
      leased_sf: 10000
    });
    const assumptions = createTestAssumptions({
      renewal_probability: 0.7,
      ti_psf_renewal: 5,
      ti_psf_new_tenant: 20,
      lc_psf_renewal: 2,
      lc_psf_new_tenant: 10
    });

    const expected = calculateExpectedRolloverCost(lease, assumptions);

    // Expected TI = 0.7 * (5 * 10K) + 0.3 * (20 * 10K) = 35K + 60K = 95K
    expect(expected.expected_ti_cost).toBeCloseTo(95000, 2);

    // Expected LC = 0.7 * (2 * 10K) + 0.3 * (10 * 10K) = 14K + 30K = 44K
    expect(expected.expected_lc_cost).toBeCloseTo(44000, 2);

    // Total = 95K + 44K = 139K
    expect(expected.expected_total_cost).toBeCloseTo(139000, 2);
  });

  it('should calculate expected vacancy loss', () => {
    const lease = createTestLease({
      leased_sf: 10000
    });
    const assumptions = createTestAssumptions({
      renewal_probability: 0.7,
      downtime_months: 6,
      market_rent_psf_annual: 24
    });

    const expected = calculateExpectedRolloverCost(lease, assumptions);

    // Vacancy only occurs in re-lease (30% probability)
    // Vacancy loss = (6/12) * $24 * 10K = $120K
    // Expected = 0.3 * $120K = $36K
    expect(expected.expected_vacancy_loss).toBeCloseTo(36000, 2);
  });

  it('should calculate expected downtime', () => {
    const lease = createTestLease();
    const assumptions = createTestAssumptions({
      renewal_probability: 0.75,
      downtime_months: 8
    });

    const expected = calculateExpectedRolloverCost(lease, assumptions);

    // Expected downtime = 0.25 * 8 = 2 months
    expect(expected.expected_downtime_months).toBe(2);
  });
});

describe('applyRolloverDecision', () => {
  it('should create new lease from renewal decision', () => {
    const originalLease = createTestLease({
      tenant_name: 'Original Tenant',
      base_rent_psf_annual: 20
    });
    const decision: RolloverDecision = {
      decision_type: 'RENEWAL',
      new_rent_psf: 25,
      new_lease_term_months: 60,
      new_start_period: 60,
      ti_cost: 50000,
      lc_cost: 20000,
      total_rollover_cost: 70000,
      free_rent_months: 1,
      downtime_periods: 0,
      vacancy_loss: 0,
      mark_to_market_psf: 5,
      mark_to_market_total: 50000,
      probability_used: 0.7
    };

    const newLease = applyRolloverDecision(decision, originalLease, 60);

    expect(newLease.tenant_name).toBe('Original Tenant'); // Same tenant for renewal
    expect(newLease.base_rent_psf_annual).toBe(25);
    expect(newLease.lease_term_months).toBe(60);
    expect(newLease.free_rent_months).toBe(1);
    expect(newLease.ti_allowance_psf).toBe(5); // $50K / 10K SF
    expect(newLease.lc_allowance_psf).toBe(2); // $20K / 10K SF
  });

  it('should create new lease from re-lease decision', () => {
    const originalLease = createTestLease({
      tenant_name: 'Original Tenant',
      space_type: 'RETAIL'
    });
    const decision: RolloverDecision = {
      decision_type: 'RELEASE',
      new_rent_psf: 28,
      new_lease_term_months: 60,
      new_start_period: 66,
      ti_cost: 200000,
      lc_cost: 100000,
      total_rollover_cost: 300000,
      free_rent_months: 3,
      downtime_periods: 6,
      vacancy_loss: 120000,
      mark_to_market_psf: 8,
      mark_to_market_total: 80000,
      probability_used: 0.3
    };

    const newLease = applyRolloverDecision(decision, originalLease, 66);

    expect(newLease.tenant_name).toBe('New Tenant (RETAIL)'); // New tenant
    expect(newLease.base_rent_psf_annual).toBe(28);
    expect(newLease.free_rent_months).toBe(3);
  });

  it('should preserve original lease characteristics', () => {
    const originalLease = createTestLease({
      space_type: 'OFFICE',
      leased_sf: 15000,
      escalation_type: 'FIXED_PERCENT',
      escalation_value: 0.03,
      recovery_structure: 'NNN'
    });
    const decision = generateRolloverDecision(originalLease, createTestAssumptions(), 60, 'RENEWAL');

    const newLease = applyRolloverDecision(decision, originalLease, 60);

    expect(newLease.space_type).toBe('OFFICE');
    expect(newLease.leased_sf).toBe(15000);
    expect(newLease.escalation_type).toBe('FIXED_PERCENT');
    expect(newLease.escalation_value).toBe(0.03);
    expect(newLease.recovery_structure).toBe('NNN');
  });
});

describe('analyzeRolloverScenarios', () => {
  it('should generate both renewal and re-lease scenarios', () => {
    const lease = createTestLease();
    const assumptions = createTestAssumptions();

    const analysis = analyzeRolloverScenarios(lease, assumptions, 60);

    expect(analysis.renewal.decision_type).toBe('RENEWAL');
    expect(analysis.release.decision_type).toBe('RELEASE');
    expect(analysis.expected).toBeDefined();
  });

  it('should show cost differences between scenarios', () => {
    const lease = createTestLease({
      leased_sf: 10000
    });
    const assumptions = createTestAssumptions({
      ti_psf_renewal: 5,
      ti_psf_new_tenant: 20,
      lc_psf_renewal: 2,
      lc_psf_new_tenant: 10
    });

    const analysis = analyzeRolloverScenarios(lease, assumptions, 60);

    // Renewal should be cheaper than re-lease
    expect(analysis.renewal.total_rollover_cost).toBeLessThan(
      analysis.release.total_rollover_cost
    );

    // Re-lease should have vacancy loss
    expect(analysis.renewal.vacancy_loss).toBe(0);
    expect(analysis.release.vacancy_loss).toBeGreaterThan(0);
  });
});

describe('calculateLeaseEconomics', () => {
  it('should calculate lease economics correctly', () => {
    const lease = createTestLease({
      leased_sf: 10000,
      base_rent_psf_annual: 20,
      lease_term_months: 60
    });
    const assumptions = createTestAssumptions({
      market_rent_psf_annual: 25
    });

    const economics = calculateLeaseEconomics(lease, assumptions);

    expect(economics.current_annual_rent).toBe(200000); // $20 * 10K
    expect(economics.market_annual_rent).toBe(250000); // $25 * 10K
    expect(economics.mark_to_market_dollar).toBe(50000); // $250K - $200K
    expect(economics.mark_to_market_percent).toBeCloseTo(25, 2); // 25% increase
    expect(economics.lease_value).toBe(1000000); // $200K * 5 years
  });

  it('should handle below-market leases', () => {
    const lease = createTestLease({
      leased_sf: 10000,
      base_rent_psf_annual: 30,
      lease_term_months: 60
    });
    const assumptions = createTestAssumptions({
      market_rent_psf_annual: 25
    });

    const economics = calculateLeaseEconomics(lease, assumptions);

    expect(economics.mark_to_market_dollar).toBe(-50000); // Negative = below market
    expect(economics.mark_to_market_percent).toBeCloseTo(-16.67, 2);
  });
});

describe('generateCapitalReserves', () => {
  it('should generate TI and LC reserves', () => {
    const lease = createTestLease({
      tenant_name: 'Test Tenant',
      leased_sf: 10000
    });
    const decision: RolloverDecision = {
      decision_type: 'RENEWAL',
      new_rent_psf: 25,
      new_lease_term_months: 60,
      new_start_period: 60,
      ti_cost: 50000,
      lc_cost: 20000,
      total_rollover_cost: 70000,
      free_rent_months: 1,
      downtime_periods: 0,
      vacancy_loss: 0,
      mark_to_market_psf: 5,
      mark_to_market_total: 50000,
      probability_used: 0.7
    };

    const reserves = generateCapitalReserves(decision, lease, 60);

    expect(reserves).toHaveLength(2);

    const tiReserve = reserves.find(r => r.reserve_type === 'TI');
    expect(tiReserve).toBeDefined();
    expect(tiReserve?.amount).toBe(50000);
    expect(tiReserve?.amount_per_sf).toBe(5);
    expect(tiReserve?.trigger_period).toBe(60);

    const lcReserve = reserves.find(r => r.reserve_type === 'LC');
    expect(lcReserve).toBeDefined();
    expect(lcReserve?.amount).toBe(20000);
  });

  it('should not generate reserves for zero costs', () => {
    const lease = createTestLease();
    const decision: RolloverDecision = {
      decision_type: 'RENEWAL',
      new_rent_psf: 25,
      new_lease_term_months: 60,
      new_start_period: 60,
      ti_cost: 0,
      lc_cost: 0,
      total_rollover_cost: 0,
      free_rent_months: 0,
      downtime_periods: 0,
      vacancy_loss: 0,
      mark_to_market_psf: 5,
      mark_to_market_total: 50000,
      probability_used: 0.7
    };

    const reserves = generateCapitalReserves(decision, lease, 60);

    expect(reserves).toHaveLength(0);
  });
});

describe('validateAssumptions', () => {
  it('should pass valid assumptions', () => {
    const assumptions = createTestAssumptions();
    const result = validateAssumptions(assumptions);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for invalid renewal probability', () => {
    const assumptions = createTestAssumptions({
      renewal_probability: 1.5
    });
    const result = validateAssumptions(assumptions);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Renewal probability must be between 0 and 1');
  });

  it('should fail for negative costs', () => {
    const assumptions = createTestAssumptions({
      ti_psf_renewal: -5
    });
    const result = validateAssumptions(assumptions);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('TI costs cannot be negative');
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createTestLease(overrides: Partial<Lease> = {}): Lease {
  return {
    rent_roll_id: 1,
    project_id: 1,
    tenant_name: 'Test Tenant',
    space_type: 'OFFICE',
    lease_start_date: new Date('2020-01-01'),
    lease_end_date: new Date('2025-01-01'),
    lease_term_months: 60,
    leased_sf: 10000,
    base_rent_psf_annual: 24,
    escalation_type: 'FIXED_PERCENT',
    escalation_value: 0.03,
    escalation_frequency_months: 12,
    recovery_structure: 'NNN',
    cam_recovery_rate: 1.0,
    tax_recovery_rate: 1.0,
    insurance_recovery_rate: 1.0,
    free_rent_months: 0,
    free_rent_start_month: 1,
    rent_abatement_amount: 0,
    has_percentage_rent: false,
    percentage_rent_rate: 0,
    percentage_rent_breakpoint: 0,
    ...overrides
  };
}

function createTestAssumptions(overrides: Partial<LeaseAssumptions> = {}): LeaseAssumptions {
  return {
    assumption_id: 1,
    project_id: 1,
    space_type: 'OFFICE',
    market_rent_psf_annual: 26,
    market_rent_growth_rate: 0.03,
    renewal_probability: 0.7,
    downtime_months: 6,
    ti_psf_renewal: 5,
    ti_psf_new_tenant: 20,
    lc_psf_renewal: 2,
    lc_psf_new_tenant: 10,
    free_rent_months_renewal: 1,
    free_rent_months_new_tenant: 3,
    ...overrides
  };
}
