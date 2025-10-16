// Lease Calculator Unit Tests
// Version: v1.0 (2025-10-13)

import {
  buildEscalationSchedule,
  calculateRentForPeriod,
  calculateFreeRentAdjustment,
  calculatePercentageRent,
  calculateRecoveries,
  calculateLeaseRevenueForPeriod,
  calculateLeaseRevenue,
  validateLease,
  type Lease,
  type EscalationSegment
} from '@/lib/financial-engine/lease-calculator';

describe('buildEscalationSchedule', () => {
  it('should create linear schedule for no escalation', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 60,
      base_rent_psf_annual: 20,
      escalation_type: 'NONE'
    });

    const schedule = buildEscalationSchedule(lease);

    expect(schedule).toHaveLength(5); // 60 months / 12 month frequency
    schedule.forEach(segment => {
      expect(segment.effective_rent_psf).toBe(20);
      expect(segment.escalation_factor).toBe(1.0);
    });
  });

  it('should apply fixed percent escalation correctly', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 60,
      base_rent_psf_annual: 20,
      escalation_type: 'FIXED_PERCENT',
      escalation_value: 0.03, // 3% annual
      escalation_frequency_months: 12
    });

    const schedule = buildEscalationSchedule(lease);

    expect(schedule).toHaveLength(5);
    expect(schedule[0].effective_rent_psf).toBeCloseTo(20, 2);
    expect(schedule[1].effective_rent_psf).toBeCloseTo(20.6, 2); // 20 * 1.03
    expect(schedule[2].effective_rent_psf).toBeCloseTo(21.218, 2); // 20.6 * 1.03
    expect(schedule[3].effective_rent_psf).toBeCloseTo(21.855, 2);
    expect(schedule[4].effective_rent_psf).toBeCloseTo(22.510, 2);
  });

  it('should apply fixed dollar escalation correctly', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 36,
      base_rent_psf_annual: 20,
      escalation_type: 'FIXED_DOLLAR',
      escalation_value: 1.0, // $1 per year
      escalation_frequency_months: 12
    });

    const schedule = buildEscalationSchedule(lease);

    expect(schedule).toHaveLength(3);
    expect(schedule[0].effective_rent_psf).toBe(20);
    expect(schedule[1].effective_rent_psf).toBe(21);
    expect(schedule[2].effective_rent_psf).toBe(22);
  });

  it('should handle CPI escalation', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 60,
      base_rent_psf_annual: 25,
      escalation_type: 'CPI',
      escalation_value: 0.025, // 2.5% annual CPI
      escalation_frequency_months: 12
    });

    const schedule = buildEscalationSchedule(lease);

    expect(schedule).toHaveLength(5);
    expect(schedule[0].effective_rent_psf).toBe(25);
    expect(schedule[1].effective_rent_psf).toBeCloseTo(25.625, 2); // 25 * 1.025
    expect(schedule[4].effective_rent_psf).toBeCloseTo(25 * Math.pow(1.025, 4), 2);
  });
});

describe('calculateRentForPeriod', () => {
  it('should calculate monthly rent correctly', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 12,
      leased_sf: 10000,
      base_rent_psf_annual: 24, // $24/SF = $240K annual = $20K monthly
      escalation_type: 'NONE'
    });

    const schedule = buildEscalationSchedule(lease);
    const { base_rent, escalated_rent } = calculateRentForPeriod(lease, 0, schedule, 0);

    expect(base_rent).toBeCloseTo(20000, 2); // $240K / 12
    expect(escalated_rent).toBeCloseTo(20000, 2);
  });

  it('should return zero for periods outside lease term', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 12,
      leased_sf: 10000,
      base_rent_psf_annual: 24
    });

    const schedule = buildEscalationSchedule(lease);

    // Before lease starts
    const beforeResult = calculateRentForPeriod(lease, -1, schedule, 0);
    expect(beforeResult.base_rent).toBe(0);
    expect(beforeResult.escalated_rent).toBe(0);

    // After lease ends
    const afterResult = calculateRentForPeriod(lease, 20, schedule, 0);
    expect(afterResult.base_rent).toBe(0);
    expect(afterResult.escalated_rent).toBe(0);
  });

  it('should calculate escalated rent correctly', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 24,
      leased_sf: 10000,
      base_rent_psf_annual: 20,
      escalation_type: 'FIXED_PERCENT',
      escalation_value: 0.03,
      escalation_frequency_months: 12
    });

    const schedule = buildEscalationSchedule(lease);

    // First year
    const year1 = calculateRentForPeriod(lease, 6, schedule, 0);
    expect(year1.escalated_rent).toBeCloseTo(200000 / 12, 2); // $20/SF * 10K SF / 12

    // Second year (3% escalation)
    const year2 = calculateRentForPeriod(lease, 18, schedule, 0);
    expect(year2.escalated_rent).toBeCloseTo((200000 * 1.03) / 12, 2);
  });
});

describe('calculateFreeRentAdjustment', () => {
  it('should return zero when no free rent', () => {
    const lease: Lease = createTestLease({
      free_rent_months: 0
    });

    const adjustment = calculateFreeRentAdjustment(lease, 5, 0);
    expect(adjustment).toBe(0);
  });

  it('should apply free rent during specified window', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 60,
      leased_sf: 10000,
      base_rent_psf_annual: 24,
      free_rent_months: 3,
      free_rent_start_month: 1
    });

    // Periods 0, 1, 2 should have free rent (months 1-3)
    const period0 = calculateFreeRentAdjustment(lease, 0, 0);
    const period1 = calculateFreeRentAdjustment(lease, 1, 0);
    const period2 = calculateFreeRentAdjustment(lease, 2, 0);
    const period3 = calculateFreeRentAdjustment(lease, 3, 0);

    const expectedFreeRent = -(24 * 10000 / 12); // -$20K monthly

    expect(period0).toBeCloseTo(expectedFreeRent, 2);
    expect(period1).toBeCloseTo(expectedFreeRent, 2);
    expect(period2).toBeCloseTo(expectedFreeRent, 2);
    expect(period3).toBe(0); // After free rent window
  });

  it('should handle delayed free rent start', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 60,
      leased_sf: 10000,
      base_rent_psf_annual: 24,
      free_rent_months: 2,
      free_rent_start_month: 7 // Starts month 7
    });

    const period5 = calculateFreeRentAdjustment(lease, 5, 0);
    const period6 = calculateFreeRentAdjustment(lease, 6, 0);
    const period7 = calculateFreeRentAdjustment(lease, 7, 0);
    const period8 = calculateFreeRentAdjustment(lease, 8, 0);

    expect(period5).toBe(0);
    expect(period6).toBeLessThan(0); // Month 7 (0-indexed = 6)
    expect(period7).toBeLessThan(0); // Month 8
    expect(period8).toBe(0); // After free rent
  });
});

describe('calculatePercentageRent', () => {
  it('should return zero when percentage rent not enabled', () => {
    const lease: Lease = createTestLease({
      has_percentage_rent: false
    });

    const percentRent = calculatePercentageRent(lease, 1000000);
    expect(percentRent).toBe(0);
  });

  it('should return zero when sales below breakpoint', () => {
    const lease: Lease = createTestLease({
      has_percentage_rent: true,
      percentage_rent_rate: 0.05,
      percentage_rent_breakpoint: 1000000
    });

    const percentRent = calculatePercentageRent(lease, 800000);
    expect(percentRent).toBe(0);
  });

  it('should calculate overage correctly', () => {
    const lease: Lease = createTestLease({
      has_percentage_rent: true,
      percentage_rent_rate: 0.05, // 5%
      percentage_rent_breakpoint: 1000000
    });

    const percentRent = calculatePercentageRent(lease, 1500000);
    const expectedOverage = 1500000 - 1000000; // $500K overage
    const expectedPercentRent = expectedOverage * 0.05; // $25K

    expect(percentRent).toBeCloseTo(expectedPercentRent, 2);
  });
});

describe('calculateRecoveries', () => {
  it('should return zero for GROSS leases', () => {
    const lease: Lease = createTestLease({
      recovery_structure: 'GROSS'
    });

    const recoveries = calculateRecoveries(lease, 0, 10000, 5000, 2000);

    expect(recoveries.cam_recovery).toBe(0);
    expect(recoveries.tax_recovery).toBe(0);
    expect(recoveries.insurance_recovery).toBe(0);
  });

  it('should recover all for NNN leases', () => {
    const lease: Lease = createTestLease({
      recovery_structure: 'NNN',
      cam_recovery_rate: 1.0,
      tax_recovery_rate: 1.0,
      insurance_recovery_rate: 1.0
    });

    const recoveries = calculateRecoveries(lease, 0, 10000, 5000, 2000);

    expect(recoveries.cam_recovery).toBe(10000);
    expect(recoveries.tax_recovery).toBe(5000);
    expect(recoveries.insurance_recovery).toBe(2000);
  });

  it('should apply recovery rates correctly', () => {
    const lease: Lease = createTestLease({
      recovery_structure: 'NNN',
      cam_recovery_rate: 0.80,
      tax_recovery_rate: 0.90,
      insurance_recovery_rate: 1.0
    });

    const recoveries = calculateRecoveries(lease, 0, 10000, 5000, 2000);

    expect(recoveries.cam_recovery).toBe(8000); // 80%
    expect(recoveries.tax_recovery).toBe(4500); // 90%
    expect(recoveries.insurance_recovery).toBe(2000); // 100%
  });

  it('should handle MODIFIED_GROSS (CAM only)', () => {
    const lease: Lease = createTestLease({
      recovery_structure: 'MODIFIED_GROSS',
      cam_recovery_rate: 1.0
    });

    const recoveries = calculateRecoveries(lease, 0, 10000, 5000, 2000);

    expect(recoveries.cam_recovery).toBe(10000);
    expect(recoveries.tax_recovery).toBe(0);
    expect(recoveries.insurance_recovery).toBe(0);
  });

  it('should handle INDUSTRIAL_GROSS (tax and insurance only)', () => {
    const lease: Lease = createTestLease({
      recovery_structure: 'INDUSTRIAL_GROSS',
      tax_recovery_rate: 1.0,
      insurance_recovery_rate: 1.0
    });

    const recoveries = calculateRecoveries(lease, 0, 10000, 5000, 2000);

    expect(recoveries.cam_recovery).toBe(0);
    expect(recoveries.tax_recovery).toBe(5000);
    expect(recoveries.insurance_recovery).toBe(2000);
  });
});

describe('validateLease', () => {
  it('should pass valid lease', () => {
    const lease: Lease = createTestLease({});
    const result = validateLease(lease);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for negative SF', () => {
    const lease: Lease = createTestLease({
      leased_sf: -1000
    });
    const result = validateLease(lease);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Leased SF must be positive');
  });

  it('should fail for negative rent', () => {
    const lease: Lease = createTestLease({
      base_rent_psf_annual: -10
    });
    const result = validateLease(lease);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Base rent PSF cannot be negative');
  });

  it('should fail for excessive free rent', () => {
    const lease: Lease = createTestLease({
      lease_term_months: 12,
      free_rent_months: 15
    });
    const result = validateLease(lease);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Free rent months cannot exceed lease term');
  });

  it('should fail for escalation without value', () => {
    const lease: Lease = createTestLease({
      escalation_type: 'FIXED_PERCENT',
      escalation_value: undefined
    });
    const result = validateLease(lease);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Escalation value required for escalation type');
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
    lease_start_date: new Date('2025-01-01'),
    lease_end_date: new Date('2030-01-01'),
    lease_term_months: 60,
    leased_sf: 10000,
    base_rent_psf_annual: 24,
    escalation_type: 'NONE',
    escalation_value: 0,
    escalation_frequency_months: 12,
    recovery_structure: 'GROSS',
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
