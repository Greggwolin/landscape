/**
 * Lease renewal is decided deterministically, not by a dice roll
 * (ARGUS parity re-audit 2026-10-21, §2.4 — #LS-1021-04).
 *
 * generateRolloverDecision used `Math.random() < renewal_probability`, so the
 * same lease and assumptions produced a different cash flow on every run. It
 * now takes the expected case (renew when the probability is at least 0.5)
 * and leaves probability-weighted costs to calculateExpectedRolloverCost, which
 * is ARGUS's blend. This module has no importer today; the test pins the
 * behaviour before anything activates it.
 */

import {
  generateRolloverDecision,
  calculateExpectedRolloverCost,
  type LeaseAssumptions,
} from '@/lib/financial-engine/lease-rollover';
import type { Lease } from '@/lib/financial-engine/lease-calculator';

const lease: Lease = {
  rent_roll_id: 1,
  project_id: 1,
  tenant_name: 'Test Tenant',
  space_type: 'OFFICE',
  lease_start_date: '2026-01-01',
  lease_end_date: '2031-01-01',
  lease_term_months: 60,
  leased_sf: 10_000,
  base_rent_psf_annual: 30,
  escalation_type: 'NONE',
  escalation_frequency_months: 12,
  recovery_structure: 'NNN',
  cam_recovery_rate: 1,
  tax_recovery_rate: 1,
  insurance_recovery_rate: 1,
  free_rent_months: 0,
  free_rent_start_month: 1,
  rent_abatement_amount: 0,
  has_percentage_rent: false,
};

function assumptions(renewal_probability: number): LeaseAssumptions {
  return {
    assumption_id: 1,
    project_id: 1,
    market_rent_psf_annual: 32,
    market_rent_growth_rate: 0.03,
    renewal_probability,
    downtime_months: 6,
    ti_psf_renewal: 10,
    ti_psf_new_tenant: 40,
    lc_psf_renewal: 2,
    lc_psf_new_tenant: 6,
    free_rent_months_renewal: 1,
    free_rent_months_new_tenant: 3,
  } as LeaseAssumptions;
}

describe('rollover decision is deterministic', () => {
  test('the same inputs give the same decision on every call', () => {
    const a = assumptions(0.5);
    const first = generateRolloverDecision(lease, a, 60).decision_type;
    for (let i = 0; i < 200; i++) {
      expect(generateRolloverDecision(lease, a, 60).decision_type).toBe(first);
    }
  });

  test('Math.random plays no part', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    try {
      // With the old dice roll, 0.999999 < 0.9 is false → RELEASE. Now the
      // expected case renews at 0.9 regardless of what random returns.
      expect(generateRolloverDecision(lease, assumptions(0.9), 60).decision_type).toBe('RENEWAL');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test('renews at or above one half, re-leases below it', () => {
    expect(generateRolloverDecision(lease, assumptions(0.7), 60).decision_type).toBe('RENEWAL');
    expect(generateRolloverDecision(lease, assumptions(0.5), 60).decision_type).toBe('RENEWAL');
    expect(generateRolloverDecision(lease, assumptions(0.49), 60).decision_type).toBe('RELEASE');
    expect(generateRolloverDecision(lease, assumptions(0.0), 60).decision_type).toBe('RELEASE');
  });

  test('forceDecision still wins', () => {
    expect(generateRolloverDecision(lease, assumptions(0.9), 60, 'RELEASE').decision_type).toBe('RELEASE');
    expect(generateRolloverDecision(lease, assumptions(0.1), 60, 'RENEWAL').decision_type).toBe('RENEWAL');
  });
});

describe('the blended path is the probability-weighted one', () => {
  test('expected costs weight renewal and re-lease by probability', () => {
    const a = assumptions(0.7);
    const expected = calculateExpectedRolloverCost(lease, a);
    // 0.7 × (10 × 10,000) + 0.3 × (40 × 10,000) = 70,000 + 120,000
    expect(expected.expected_ti_cost).toBeCloseTo(190_000, 6);
    // vacancy only in the re-lease case: 0.3 × (6/12 × 32 × 10,000)
    expect(expected.expected_vacancy_loss).toBeCloseTo(0.3 * 160_000, 6);
    expect(expected.expected_downtime_months).toBeCloseTo(1.8, 9);
  });
});
