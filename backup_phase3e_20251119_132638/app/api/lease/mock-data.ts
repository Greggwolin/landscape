import type {
  LeaseData,
  Lease,
  LeaseMetrics,
  BaseRent,
  Escalation,
  Recovery,
  AdditionalIncome,
  TenantImprovement,
  Commission,
  MarketAssumption,
  LeaseTimelineEvent
} from '@/app/lease/types';

const lease: Lease = {
  lease_id: 101,
  project_id: 1,
  parcel_id: 5,
  tenant_name: 'Summit Fitness',
  tenant_contact: 'Alex Morgan',
  tenant_email: 'alex.morgan@example.com',
  tenant_phone: '(480) 555-1881',
  lease_status: 'Contract',
  lease_type: 'Retail',
  suite_number: 'B-204',
  lease_commencement_date: '2025-01-01',
  rent_start_date: '2025-02-01',
  lease_expiration_date: '2035-01-31',
  lease_term_months: 120,
  leased_sf: 12500,
  floor_number: 2,
  number_of_renewal_options: 2,
  renewal_option_term_months: 60,
  renewal_notice_months: 12,
  renewal_probability_pct: 65,
  early_termination_allowed: false,
  termination_notice_months: 0,
  termination_penalty_amount: 0,
  security_deposit_amount: 85000,
  security_deposit_months: 3,
  tenant_classification: 'Anchor',
  affects_occupancy: true,
  expansion_rights: true,
  right_of_first_refusal: true,
  exclusive_use_clause: 'Exclusive fitness center rights within 2 miles.',
  co_tenancy_clause: 'Terminates if grocery anchor vacates for > 180 days.',
  radius_restriction: '5-mile radius',
  notes: 'Renewal probability weighted at 65% given strong performance.'
};

const rentSchedule: BaseRent[] = [
  {
    base_rent_id: 1,
    lease_id: 101,
    period_number: 1,
    period_start_date: '2025-02-01',
    period_end_date: '2026-01-31',
    base_rent_psf_annual: 22,
    base_rent_annual: 275000,
    base_rent_monthly: 22916.67,
    rent_type: 'Fixed',
    free_rent_months: 0
  },
  {
    base_rent_id: 2,
    lease_id: 101,
    period_number: 2,
    period_start_date: '2026-02-01',
    period_end_date: '2027-01-31',
    base_rent_psf_annual: 23,
    base_rent_annual: 287500,
    base_rent_monthly: 23958.33,
    rent_type: 'Fixed',
    free_rent_months: 0
  }
];

const escalations: Escalation[] = [
  {
    escalation_id: 11,
    lease_id: 101,
    escalation_type: 'Fixed Percentage',
    escalation_pct: 3,
    escalation_frequency: 'Annual',
    compound_escalation: true,
    first_escalation_date: '2026-02-01'
  }
];

const recoveries: Recovery = {
  recovery_id: 21,
  lease_id: 101,
  recovery_structure: 'Triple Net',
  expense_cap_pct: 12,
  categories: [
    { name: 'CAM', included: true, cap: 4, basis: 'Stop' },
    { name: 'Taxes', included: true, cap: 3, basis: 'Pro Rata' },
    { name: 'Insurance', included: true, cap: 2, basis: 'Pro Rata' },
    { name: 'Utilities', included: false, cap: 0, basis: 'Base Year' }
  ]
};

const additionalIncome: AdditionalIncome = {
  parking_spaces: 40,
  parking_rate: 85,
  other_income: [
    { label: 'Locker rentals', amount: 750, frequency: 'Monthly' },
    { label: 'Personal training revenue share', amount: 18000, frequency: 'Annual' }
  ]
};

const improvements: TenantImprovement = {
  tenant_improvement_id: 31,
  lease_id: 101,
  allowance_psf: 45,
  allowance_total: 562500,
  reimbursement_structure: 'Upfront'
};

const commissions: Commission = {
  commission_id: 41,
  lease_id: 101,
  base_commission_pct: 4.5,
  renewal_commission_pct: 2.25,
  tiers: [
    { breakpoint_psf: 25, rate_pct: 5 },
    { breakpoint_psf: 30, rate_pct: 6 }
  ]
};

const marketAssumptions: MarketAssumption[] = [
  { year: 2025, projected_rent_psf: 23, renewal_cost_psf: 12, turnover_cost_psf: 35 },
  { year: 2026, projected_rent_psf: 23.5, renewal_cost_psf: 12, turnover_cost_psf: 36 },
  { year: 2027, projected_rent_psf: 24, renewal_cost_psf: 12.5, turnover_cost_psf: 37 }
];

const timeline: LeaseTimelineEvent[] = [
  { date: '2024-11-15', description: 'Lease executed', details: 'Executed by Summit Fitness Holdings LLC', completed: true },
  { date: '2025-01-01', description: 'Tenant delivery', details: 'Landlord delivers possession', completed: true },
  { date: '2025-02-01', description: 'Rent commencement', details: 'Base rent begins', completed: false }
];

const metrics: LeaseMetrics = {
  annual_base_rent: 275000,
  rent_per_sf: 22,
  free_rent_months: 0,
  walt_months: 120
};

let mockLeaseData: LeaseData = {
  lease,
  rentSchedule,
  escalations,
  recoveries,
  additionalIncome,
  improvements,
  commissions,
  marketAssumptions,
  timeline,
  metrics
};

export const getLeaseData = (id: string): LeaseData => {
  if (Number(id) !== mockLeaseData.lease.lease_id) {
    return mockLeaseData;
  }
  return mockLeaseData;
};

export const updateLeaseSection = <K extends keyof LeaseData>(section: K, value: LeaseData[K] | Partial<LeaseData[K]>) => {
  const current = mockLeaseData[section];
  if (Array.isArray(current) && Array.isArray(value)) {
    mockLeaseData = {
      ...mockLeaseData,
      [section]: value
    };
    return;
  }

  if (!Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)) {
    mockLeaseData = {
      ...mockLeaseData,
      [section]: {
        ...current,
        ...value
      } as LeaseData[K]
    };
    return;
  }

  mockLeaseData = {
    ...mockLeaseData,
    [section]: value as LeaseData[K]
  };
};

export const setLease = (partial: Partial<Lease>) => {
  mockLeaseData = {
    ...mockLeaseData,
    lease: {
      ...mockLeaseData.lease,
      ...partial
    }
  };
};
export const getRentSchedule = () => mockLeaseData.rentSchedule;
export const addRentPeriod = (period: BaseRent) => {
  mockLeaseData = {
    ...mockLeaseData,
    rentSchedule: [...mockLeaseData.rentSchedule, period]
  };
};
export const updateRentPeriod = (periodId: number, update: Partial<BaseRent>) => {
  mockLeaseData = {
    ...mockLeaseData,
    rentSchedule: mockLeaseData.rentSchedule.map((period) =>
      period.base_rent_id === periodId ? { ...period, ...update } : period
    )
  };
};
export const deleteRentPeriod = (periodId: number) => {
  mockLeaseData = {
    ...mockLeaseData,
    rentSchedule: mockLeaseData.rentSchedule.filter((period) => period.base_rent_id !== periodId)
  };
};

export const getEscalations = () => mockLeaseData.escalations;
export const addEscalation = (escalation: Escalation) => {
  mockLeaseData = {
    ...mockLeaseData,
    escalations: [...mockLeaseData.escalations, escalation]
  };
};
export const updateEscalation = (id: number, update: Partial<Escalation>) => {
  mockLeaseData = {
    ...mockLeaseData,
    escalations: mockLeaseData.escalations.map((rule) =>
      rule.escalation_id === id ? { ...rule, ...update } : rule
    )
  };
};
export const deleteEscalation = (id: number) => {
  mockLeaseData = {
    ...mockLeaseData,
    escalations: mockLeaseData.escalations.filter((rule) => rule.escalation_id !== id)
  };
};

export const updateRecoveries = (update: Partial<Recovery>) => {
  mockLeaseData = {
    ...mockLeaseData,
    recoveries: {
      ...mockLeaseData.recoveries,
      ...update
    }
  };
};

export const updateAdditionalIncome = (update: Partial<AdditionalIncome>) => {
  mockLeaseData = {
    ...mockLeaseData,
    additionalIncome: {
      ...mockLeaseData.additionalIncome,
      ...update
    }
  };
};

export const updateImprovements = (update: Partial<TenantImprovement>) => {
  mockLeaseData = {
    ...mockLeaseData,
    improvements: {
      ...mockLeaseData.improvements,
      ...update
    }
  };
};

export const updateCommissions = (update: Partial<Commission>) => {
  mockLeaseData = {
    ...mockLeaseData,
    commissions: {
      ...mockLeaseData.commissions,
      ...update
    }
  };
};

export const updateMarketAssumptions = (rows: MarketAssumption[]) => {
  mockLeaseData = {
    ...mockLeaseData,
    marketAssumptions: rows
  };
};


export const getMetrics = () => mockLeaseData.metrics;
export const getTimeline = () => mockLeaseData.timeline;
export const resetMockLease = () => mockLeaseData;
