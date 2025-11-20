/**
 * Financial Engine - Database Utility Functions
 * Provides connection pooling and common query operations
 */

import { neon } from '@neondatabase/serverless';
import type {
  Lease,
  LeaseCreate,
  LeaseUpdate,
  LeaseData,
  BaseRent,
  BaseRentCreate,
  BaseRentUpdate,
  Escalation,
  EscalationCreate,
  EscalationUpdate,
  Recovery,
  RecoveryCreate,
  RecoveryUpdate,
  AdditionalIncome,
  AdditionalIncomeCreate,
  AdditionalIncomeUpdate,
  TenantImprovement,
  TenantImprovementCreate,
  TenantImprovementUpdate,
  LeasingCommission,
  LeasingCommissionCreate,
  LeasingCommissionUpdate,
  Lot,
  LotCreate,
  LotUpdate,
  Loan,
  LoanCreate,
  LoanUpdate,
  Equity,
  EquityCreate,
  EquityUpdate,
  OperatingExpense,
  OperatingExpenseCreate,
  OperatingExpenseUpdate,
  LeaseSummary,
  RentRoll,
} from '@/types/financial-engine';

// Database connection string from environment
const sql = neon(process.env.DATABASE_URL!);

// =====================================================================
// LEASE OPERATIONS
// =====================================================================

export async function createLease(data: LeaseCreate): Promise<Lease> {
  const result = await sql`
    INSERT INTO landscape.tbl_lease (
      project_id, parcel_id, lot_id,
      tenant_name, tenant_contact, tenant_email, tenant_phone, tenant_classification,
      lease_status, lease_type, suite_number, floor_number,
      lease_execution_date, lease_commencement_date, rent_start_date, lease_expiration_date, lease_term_months,
      leased_sf, usable_sf,
      number_of_renewal_options, renewal_option_term_months, renewal_notice_months, renewal_probability_pct,
      early_termination_allowed, termination_notice_months, termination_penalty_amount,
      security_deposit_amount, security_deposit_months,
      affects_occupancy, expansion_rights, right_of_first_refusal,
      exclusive_use_clause, co_tenancy_clause, radius_restriction,
      notes, lease_metadata,
      created_by, updated_by
    ) VALUES (
      ${data.project_id}, ${data.parcel_id ?? null}, ${data.lot_id ?? null},
      ${data.tenant_name}, ${data.tenant_contact ?? null}, ${data.tenant_email ?? null}, ${data.tenant_phone ?? null}, ${data.tenant_classification ?? null},
      ${data.lease_status ?? 'Speculative'}, ${data.lease_type ?? null}, ${data.suite_number ?? null}, ${data.floor_number ?? null},
      ${data.lease_execution_date ?? null}, ${data.lease_commencement_date}, ${data.rent_start_date ?? null}, ${data.lease_expiration_date}, ${data.lease_term_months},
      ${data.leased_sf}, ${data.usable_sf ?? null},
      ${data.number_of_renewal_options ?? 0}, ${data.renewal_option_term_months ?? null}, ${data.renewal_notice_months ?? null}, ${data.renewal_probability_pct ?? 50},
      ${data.early_termination_allowed ?? false}, ${data.termination_notice_months ?? null}, ${data.termination_penalty_amount ?? null},
      ${data.security_deposit_amount ?? null}, ${data.security_deposit_months ?? null},
      ${data.affects_occupancy ?? true}, ${data.expansion_rights ?? false}, ${data.right_of_first_refusal ?? false},
      ${data.exclusive_use_clause ?? null}, ${data.co_tenancy_clause ?? null}, ${data.radius_restriction ?? null},
      ${data.notes ?? null}, ${JSON.stringify(data.lease_metadata ?? {})},
      ${data.created_by ?? null}, ${data.updated_by ?? null}
    )
    RETURNING *
  `;

  return result[0] as Lease;
}

export async function getLease(leaseId: number): Promise<Lease | null> {
  const result = await sql`
    SELECT * FROM landscape.tbl_lease
    WHERE lease_id = ${leaseId}
  `;

  return result[0] ? (result[0] as Lease) : null;
}

export async function getLeasesByProject(projectId: number): Promise<Lease[]> {
  const result = await sql`
    SELECT * FROM landscape.tbl_lease
    WHERE project_id = ${projectId}
    ORDER BY lease_expiration_date, tenant_name
  `;

  return result as Lease[];
}

export async function getLeasesByParcel(parcelId: number): Promise<Lease[]> {
  const result = await sql`
    SELECT * FROM landscape.tbl_lease
    WHERE parcel_id = ${parcelId}
    ORDER BY suite_number, tenant_name
  `;

  return result as Lease[];
}

export async function updateLease(leaseId: number, data: LeaseUpdate): Promise<Lease | null> {
  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'lease_id') {
      updates.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    return getLease(leaseId);
  }

  // Add updated_at
  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_lease
    SET ${updates.join(', ')}
    WHERE lease_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(leaseId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as Lease) : null;
}

export async function deleteLease(leaseId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM landscape.tbl_lease
    WHERE lease_id = ${leaseId}
  `;

  return result.count > 0;
}

// =====================================================================
// BASE RENT OPERATIONS
// =====================================================================

export async function createBaseRent(data: BaseRentCreate): Promise<BaseRent> {
  const result = await sql`
    INSERT INTO landscape.tbl_base_rent (
      lease_id, period_number, period_start_date, period_end_date,
      rent_type, base_rent_psf_annual, base_rent_annual, base_rent_monthly,
      percentage_rent_rate, percentage_rent_breakpoint, percentage_rent_annual,
      free_rent_months
    ) VALUES (
      ${data.lease_id}, ${data.period_number}, ${data.period_start_date}, ${data.period_end_date},
      ${data.rent_type ?? 'Fixed'}, ${data.base_rent_psf_annual ?? null}, ${data.base_rent_annual ?? null}, ${data.base_rent_monthly ?? null},
      ${data.percentage_rent_rate ?? null}, ${data.percentage_rent_breakpoint ?? null}, ${data.percentage_rent_annual ?? null},
      ${data.free_rent_months ?? 0}
    )
    RETURNING *
  `;

  return result[0] as BaseRent;
}

export async function getBaseRentByLease(leaseId: number): Promise<BaseRent[]> {
  const result = await sql`
    SELECT * FROM landscape.tbl_base_rent
    WHERE lease_id = ${leaseId}
    ORDER BY period_number
  `;

  return result as BaseRent[];
}

export async function updateBaseRent(baseRentId: number, data: BaseRentUpdate): Promise<BaseRent | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'base_rent_id') {
      updates.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    const result = await sql`SELECT * FROM landscape.tbl_base_rent WHERE base_rent_id = ${baseRentId}`;
    return result[0] as BaseRent;
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_base_rent
    SET ${updates.join(', ')}
    WHERE base_rent_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(baseRentId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as BaseRent) : null;
}

export async function deleteBaseRent(baseRentId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM landscape.tbl_base_rent
    WHERE base_rent_id = ${baseRentId}
  `;

  return result.count > 0;
}

// =====================================================================
// ESCALATION OPERATIONS
// =====================================================================

export async function createEscalation(data: EscalationCreate): Promise<Escalation> {
  const result = await sql`
    INSERT INTO landscape.tbl_escalation (
      lease_id, escalation_type, escalation_pct, escalation_frequency, compound_escalation,
      cpi_index, cpi_floor_pct, cpi_cap_pct, tenant_cpi_share_pct,
      annual_increase_amount, step_schedule, first_escalation_date
    ) VALUES (
      ${data.lease_id}, ${data.escalation_type}, ${data.escalation_pct ?? null}, ${data.escalation_frequency ?? 'Annual'}, ${data.compound_escalation ?? true},
      ${data.cpi_index ?? null}, ${data.cpi_floor_pct ?? null}, ${data.cpi_cap_pct ?? null}, ${data.tenant_cpi_share_pct ?? 100},
      ${data.annual_increase_amount ?? null}, ${JSON.stringify(data.step_schedule ?? null)}, ${data.first_escalation_date ?? null}
    )
    RETURNING *
  `;

  return result[0] as Escalation;
}

export async function getEscalationsByLease(leaseId: number): Promise<Escalation[]> {
  const result = await sql`
    SELECT * FROM landscape.tbl_escalation
    WHERE lease_id = ${leaseId}
  `;

  return result as Escalation[];
}

export async function updateEscalation(escalationId: number, data: EscalationUpdate): Promise<Escalation | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'escalation_id') {
      updates.push(`${key} = $${values.length + 1}`);
      if (key === 'step_schedule' && value !== null) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  });

  if (updates.length === 0) {
    const result = await sql`SELECT * FROM landscape.tbl_escalation WHERE escalation_id = ${escalationId}`;
    return result[0] as Escalation;
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_escalation
    SET ${updates.join(', ')}
    WHERE escalation_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(escalationId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as Escalation) : null;
}

export async function deleteEscalation(escalationId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM landscape.tbl_escalation
    WHERE escalation_id = ${escalationId}
  `;

  return result.count > 0;
}

// =====================================================================
// RECOVERY OPERATIONS
// =====================================================================

export async function createRecovery(data: RecoveryCreate): Promise<Recovery> {
  const result = await sql`
    INSERT INTO landscape.tbl_recovery (
      lease_id, recovery_structure, expense_cap_pct, categories
    ) VALUES (
      ${data.lease_id}, ${data.recovery_structure ?? 'Triple Net'}, ${data.expense_cap_pct ?? null}, ${JSON.stringify(data.categories)}
    )
    RETURNING *
  `;

  return result[0] as Recovery;
}

export async function getRecoveryByLease(leaseId: number): Promise<Recovery | null> {
  const result = await sql`
    SELECT * FROM landscape.tbl_recovery
    WHERE lease_id = ${leaseId}
  `;

  return result[0] ? (result[0] as Recovery) : null;
}

export async function updateRecovery(recoveryId: number, data: RecoveryUpdate): Promise<Recovery | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'recovery_id') {
      updates.push(`${key} = $${values.length + 1}`);
      if (key === 'categories') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  });

  if (updates.length === 0) {
    const result = await sql`SELECT * FROM landscape.tbl_recovery WHERE recovery_id = ${recoveryId}`;
    return result[0] as Recovery;
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_recovery
    SET ${updates.join(', ')}
    WHERE recovery_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(recoveryId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as Recovery) : null;
}

export async function deleteRecovery(recoveryId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM landscape.tbl_recovery
    WHERE recovery_id = ${recoveryId}
  `;

  return result.count > 0;
}

// =====================================================================
// FULL LEASE DATA OPERATIONS
// =====================================================================

export async function getFullLeaseData(leaseId: number): Promise<LeaseData | null> {
  const lease = await getLease(leaseId);
  if (!lease) return null;

  const [rentSchedule, escalations, recoveries, additionalIncome, improvements, commissions] = await Promise.all([
    getBaseRentByLease(leaseId),
    getEscalationsByLease(leaseId),
    getRecoveryByLease(leaseId),
    getAdditionalIncomeByLease(leaseId),
    getTenantImprovementByLease(leaseId),
    getLeasingCommissionByLease(leaseId),
  ]);

  return {
    lease,
    rentSchedule,
    escalations,
    recoveries: recoveries ?? undefined,
    additionalIncome: additionalIncome ?? undefined,
    improvements: improvements ?? undefined,
    commissions: commissions ?? undefined,
  };
}

// =====================================================================
// ADDITIONAL INCOME OPERATIONS
// =====================================================================

export async function createAdditionalIncome(data: AdditionalIncomeCreate): Promise<AdditionalIncome> {
  const result = await sql`
    INSERT INTO landscape.tbl_additional_income (
      lease_id, parking_spaces, parking_rate_monthly, parking_annual, other_income
    ) VALUES (
      ${data.lease_id}, ${data.parking_spaces ?? 0}, ${data.parking_rate_monthly ?? null}, ${data.parking_annual ?? null}, ${JSON.stringify(data.other_income ?? [])}
    )
    RETURNING *
  `;

  return result[0] as AdditionalIncome;
}

export async function getAdditionalIncomeByLease(leaseId: number): Promise<AdditionalIncome | null> {
  const result = await sql`
    SELECT * FROM landscape.tbl_additional_income
    WHERE lease_id = ${leaseId}
  `;

  return result[0] ? (result[0] as AdditionalIncome) : null;
}

export async function updateAdditionalIncome(additionalIncomeId: number, data: AdditionalIncomeUpdate): Promise<AdditionalIncome | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'additional_income_id') {
      updates.push(`${key} = $${values.length + 1}`);
      if (key === 'other_income') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  });

  if (updates.length === 0) {
    const result = await sql`SELECT * FROM landscape.tbl_additional_income WHERE additional_income_id = ${additionalIncomeId}`;
    return result[0] as AdditionalIncome;
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_additional_income
    SET ${updates.join(', ')}
    WHERE additional_income_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(additionalIncomeId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as AdditionalIncome) : null;
}

// =====================================================================
// TENANT IMPROVEMENT OPERATIONS
// =====================================================================

export async function createTenantImprovement(data: TenantImprovementCreate): Promise<TenantImprovement> {
  const result = await sql`
    INSERT INTO landscape.tbl_tenant_improvement (
      lease_id, allowance_psf, allowance_total, actual_cost, landlord_contribution, reimbursement_structure, amortization_months
    ) VALUES (
      ${data.lease_id}, ${data.allowance_psf ?? null}, ${data.allowance_total ?? null}, ${data.actual_cost ?? null}, ${data.landlord_contribution ?? null}, ${data.reimbursement_structure ?? 'Upfront'}, ${data.amortization_months ?? null}
    )
    RETURNING *
  `;

  return result[0] as TenantImprovement;
}

export async function getTenantImprovementByLease(leaseId: number): Promise<TenantImprovement | null> {
  const result = await sql`
    SELECT * FROM landscape.tbl_tenant_improvement
    WHERE lease_id = ${leaseId}
  `;

  return result[0] ? (result[0] as TenantImprovement) : null;
}

export async function updateTenantImprovement(tiId: number, data: TenantImprovementUpdate): Promise<TenantImprovement | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'tenant_improvement_id') {
      updates.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    const result = await sql`SELECT * FROM landscape.tbl_tenant_improvement WHERE tenant_improvement_id = ${tiId}`;
    return result[0] as TenantImprovement;
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_tenant_improvement
    SET ${updates.join(', ')}
    WHERE tenant_improvement_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(tiId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as TenantImprovement) : null;
}

// =====================================================================
// LEASING COMMISSION OPERATIONS
// =====================================================================

export async function createLeasingCommission(data: LeasingCommissionCreate): Promise<LeasingCommission> {
  const result = await sql`
    INSERT INTO landscape.tbl_leasing_commission (
      lease_id, base_commission_pct, renewal_commission_pct, tiers, commission_amount
    ) VALUES (
      ${data.lease_id}, ${data.base_commission_pct ?? null}, ${data.renewal_commission_pct ?? null}, ${JSON.stringify(data.tiers ?? [])}, ${data.commission_amount ?? null}
    )
    RETURNING *
  `;

  return result[0] as LeasingCommission;
}

export async function getLeasingCommissionByLease(leaseId: number): Promise<LeasingCommission | null> {
  const result = await sql`
    SELECT * FROM landscape.tbl_leasing_commission
    WHERE lease_id = ${leaseId}
  `;

  return result[0] ? (result[0] as LeasingCommission) : null;
}

export async function updateLeasingCommission(commissionId: number, data: LeasingCommissionUpdate): Promise<LeasingCommission | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'commission_id') {
      updates.push(`${key} = $${values.length + 1}`);
      if (key === 'tiers') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  });

  if (updates.length === 0) {
    const result = await sql`SELECT * FROM landscape.tbl_leasing_commission WHERE commission_id = ${commissionId}`;
    return result[0] as LeasingCommission;
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_leasing_commission
    SET ${updates.join(', ')}
    WHERE commission_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(commissionId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as LeasingCommission) : null;
}

// =====================================================================
// VIEWS & REPORTS
// =====================================================================

export async function getLeaseSummary(projectId: number): Promise<LeaseSummary | null> {
  const result = await sql`
    SELECT * FROM landscape.v_lease_summary
    WHERE project_id = ${projectId}
  `;

  return result[0] ? (result[0] as LeaseSummary) : null;
}

export async function getRentRoll(projectId: number): Promise<RentRoll[]> {
  const result = await sql`
    SELECT * FROM landscape.v_rent_roll
    WHERE project_id = ${projectId}
    ORDER BY lease_expiration_date, tenant_name
  `;

  return result as RentRoll[];
}

// =====================================================================
// LOT OPERATIONS
// =====================================================================

export async function createLot(data: LotCreate): Promise<Lot> {
  const result = await sql`
    INSERT INTO landscape.tbl_lot (
      parcel_id, phase_id, project_id,
      lot_number, unit_number, suite_number,
      unit_type, lot_sf, unit_sf, bedrooms, bathrooms, floor_number,
      base_price, price_psf, options_price, total_price,
      lot_status, sale_date, close_date, lease_id
    ) VALUES (
      ${data.parcel_id}, ${data.phase_id ?? null}, ${data.project_id},
      ${data.lot_number ?? null}, ${data.unit_number ?? null}, ${data.suite_number ?? null},
      ${data.unit_type ?? null}, ${data.lot_sf ?? null}, ${data.unit_sf ?? null}, ${data.bedrooms ?? null}, ${data.bathrooms ?? null}, ${data.floor_number ?? null},
      ${data.base_price ?? null}, ${data.price_psf ?? null}, ${data.options_price ?? null}, ${data.total_price ?? null},
      ${data.lot_status ?? 'Available'}, ${data.sale_date ?? null}, ${data.close_date ?? null}, ${data.lease_id ?? null}
    )
    RETURNING *
  `;

  return result[0] as Lot;
}

export async function getLot(lotId: number): Promise<Lot | null> {
  const result = await sql`
    SELECT * FROM landscape.tbl_lot
    WHERE lot_id = ${lotId}
  `;

  return result[0] ? (result[0] as Lot) : null;
}

export async function getLotsByProject(projectId: number): Promise<Lot[]> {
  const result = await sql`
    SELECT * FROM landscape.tbl_lot
    WHERE project_id = ${projectId}
    ORDER BY lot_number
  `;

  return result as Lot[];
}

export async function getLotsByParcel(parcelId: number): Promise<Lot[]> {
  const result = await sql`
    SELECT * FROM landscape.tbl_lot
    WHERE parcel_id = ${parcelId}
    ORDER BY lot_number
  `;

  return result as Lot[];
}

export async function updateLot(lotId: number, data: LotUpdate): Promise<Lot | null> {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'lot_id') {
      updates.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    return getLot(lotId);
  }

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE landscape.tbl_lot
    SET ${updates.join(', ')}
    WHERE lot_id = $${values.length + 1}
    RETURNING *
  `;

  values.push(lotId);

  const result = await sql(query, values);
  return result[0] ? (result[0] as Lot) : null;
}

export async function deleteLot(lotId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM landscape.tbl_lot
    WHERE lot_id = ${lotId}
  `;

  return result.count > 0;
}
