/**
 * CRE Cash Flow Calculation Engine
 *
 * Calculates property-level cash flow for commercial real estate properties
 * Supports multiple lease types: NNN, Modified Gross, Gross, Ground Lease
 *
 * Based on ARGUS-level retail analysis methodology
 */

export interface LeaseData {
  lease_id: number;
  space_id: number;
  tenant_id: number;
  tenant_name: string;
  lease_type: 'NNN' | 'Modified Gross' | 'Gross' | 'Ground Lease' | 'Absolute NNN';
  lease_status: string;
  lease_commencement_date: Date;
  lease_expiration_date: Date;
  leased_sf: number;

  // Base rent schedule
  base_rent: {
    period_start_date: Date;
    period_end_date: Date;
    base_rent_annual: number;
    base_rent_monthly: number;
    base_rent_psf_annual: number;
  }[];

  // Escalations
  escalation?: {
    escalation_type: 'Fixed Percentage' | 'CPI' | 'Fixed Dollar' | 'Stepped';
    escalation_pct?: number;
    escalation_frequency?: string;
    cpi_floor_pct?: number;
    cpi_cap_pct?: number;
  };

  // Percentage rent (retail)
  percentage_rent?: {
    breakpoint_amount: number;
    percentage_rate: number;
    prior_year_sales?: number;
  };

  // Expense recovery structure
  expense_recovery: {
    recovery_structure: string;
    property_tax_recovery_pct: number;
    insurance_recovery_pct: number;
    cam_recovery_pct: number;
    utilities_recovery_pct?: number;
    expense_cap_psf?: number;
    expense_cap_escalation_pct?: number;
  };
}

export interface PropertyData {
  cre_property_id: number;
  property_name: string;
  rentable_sf: number;
  acquisition_price: number;
  leases: LeaseData[];
}

export interface OperatingExpenses {
  period_date: Date;
  property_taxes: number;
  insurance: number;
  cam_expenses: number;
  utilities: number;
  management_fee_pct: number; // As % of EGI
  repairs_maintenance: number;
  other_expenses: number;
}

export interface CapitalItems {
  period_date: Date;
  capital_reserves: number;
  tenant_improvements: number;
  leasing_commissions: number;
}

export interface CashFlowPeriod {
  period_id: number;
  period_date: Date;

  // Revenue components
  base_rent_revenue: number;
  percentage_rent_revenue: number;
  expense_recovery_revenue: number;
  other_income: number;
  gross_revenue: number;

  // Vacancy & credit loss
  vacancy_loss: number;
  credit_loss: number;
  effective_gross_income: number;

  // Operating expenses
  property_taxes: number;
  insurance: number;
  cam_expenses: number;
  utilities: number;
  management_fee: number;
  repairs_maintenance: number;
  other_expenses: number;
  total_operating_expenses: number;

  // NOI
  net_operating_income: number;

  // Capital items
  capital_reserves: number;
  tenant_improvements: number;
  leasing_commissions: number;
  total_capital: number;

  // Cash flow
  cash_flow_before_debt: number;
  debt_service: number;
  net_cash_flow: number;
}

/**
 * Calculate base rent for a specific period
 */
export function calculateBaseRent(
  lease: LeaseData,
  periodDate: Date
): number {
  // Find the applicable rent schedule for this period
  const applicableRent = lease.base_rent.find(rent => {
    const startDate = new Date(rent.period_start_date);
    const endDate = new Date(rent.period_end_date);
    return periodDate >= startDate && periodDate <= endDate;
  });

  if (!applicableRent) {
    // Lease may not have commenced or has expired
    return 0;
  }

  // Return monthly rent (annual / 12)
  return applicableRent.base_rent_annual / 12;
}

/**
 * Calculate percentage rent for retail tenants
 */
export function calculatePercentageRent(
  lease: LeaseData,
  periodDate: Date,
  projectedAnnualSales?: number
): number {
  if (!lease.percentage_rent) {
    return 0;
  }

  const { breakpoint_amount, percentage_rate, prior_year_sales } = lease.percentage_rent;

  // Use projected sales or prior year sales
  const annualSales = projectedAnnualSales || prior_year_sales || 0;

  if (annualSales <= breakpoint_amount) {
    return 0; // Sales below breakpoint
  }

  // Calculate overage rent (monthly)
  const overageAmount = annualSales - breakpoint_amount;
  const percentageRentAnnual = overageAmount * (percentage_rate / 100);

  return percentageRentAnnual / 12; // Monthly
}

/**
 * Calculate expense recoveries from tenant based on lease structure
 */
export function calculateExpenseRecovery(
  lease: LeaseData,
  opex: OperatingExpenses,
  totalRentableSF: number
): number {
  const { expense_recovery } = lease;
  const tenantProRataShare = lease.leased_sf / totalRentableSF;

  // Calculate tenant's share of each expense category
  const taxRecovery = opex.property_taxes * tenantProRataShare * (expense_recovery.property_tax_recovery_pct / 100);
  const insuranceRecovery = opex.insurance * tenantProRataShare * (expense_recovery.insurance_recovery_pct / 100);
  const camRecovery = opex.cam_expenses * tenantProRataShare * (expense_recovery.cam_recovery_pct / 100);
  const utilityRecovery = opex.utilities * tenantProRataShare * ((expense_recovery.utilities_recovery_pct || 0) / 100);

  let totalRecovery = taxRecovery + insuranceRecovery + camRecovery + utilityRecovery;

  // Apply CAM cap if specified (Modified Gross leases)
  if (expense_recovery.expense_cap_psf) {
    const capAmount = expense_recovery.expense_cap_psf * lease.leased_sf / 12; // Monthly cap
    totalRecovery = Math.min(totalRecovery, capAmount);
  }

  return totalRecovery;
}

/**
 * Calculate property-level cash flow for a single period
 */
export function calculatePeriodCashFlow(
  property: PropertyData,
  periodDate: Date,
  periodNumber: number,
  opex: OperatingExpenses,
  capitalItems: CapitalItems,
  debtService: number = 0,
  vacancyPct: number = 0.05,
  creditLossPct: number = 0.02
): CashFlowPeriod {
  // Initialize revenue components
  let baseRentRevenue = 0;
  let percentageRentRevenue = 0;
  let expenseRecoveryRevenue = 0;

  // Calculate revenue from all active leases
  for (const lease of property.leases) {
    const leaseStartDate = new Date(lease.lease_commencement_date);
    const leaseEndDate = new Date(lease.lease_expiration_date);

    // Skip if lease not active in this period
    if (periodDate < leaseStartDate || periodDate > leaseEndDate) {
      continue;
    }

    // Base rent
    baseRentRevenue += calculateBaseRent(lease, periodDate);

    // Percentage rent (if applicable)
    percentageRentRevenue += calculatePercentageRent(lease, periodDate);

    // Expense recoveries
    expenseRecoveryRevenue += calculateExpenseRecovery(lease, opex, property.rentable_sf);
  }

  const otherIncome = 0; // Parking, signage, etc. - could be added
  const grossRevenue = baseRentRevenue + percentageRentRevenue + expenseRecoveryRevenue + otherIncome;

  // Vacancy and credit loss
  const vacancyLoss = grossRevenue * vacancyPct;
  const creditLoss = grossRevenue * creditLossPct;
  const effectiveGrossIncome = grossRevenue - vacancyLoss - creditLoss;

  // Operating expenses
  const managementFee = effectiveGrossIncome * (opex.management_fee_pct / 100);
  const totalOperatingExpenses =
    opex.property_taxes +
    opex.insurance +
    opex.cam_expenses +
    opex.utilities +
    managementFee +
    opex.repairs_maintenance +
    opex.other_expenses;

  // Net Operating Income
  const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;

  // Capital items
  const totalCapital =
    capitalItems.capital_reserves +
    capitalItems.tenant_improvements +
    capitalItems.leasing_commissions;

  // Cash flow
  const cashFlowBeforeDebt = netOperatingIncome - totalCapital;
  const netCashFlow = cashFlowBeforeDebt - debtService;

  return {
    period_id: periodNumber,
    period_date: periodDate,

    // Revenue
    base_rent_revenue: baseRentRevenue,
    percentage_rent_revenue: percentageRentRevenue,
    expense_recovery_revenue: expenseRecoveryRevenue,
    other_income: otherIncome,
    gross_revenue: grossRevenue,

    // Vacancy & credit loss
    vacancy_loss: vacancyLoss,
    credit_loss: creditLoss,
    effective_gross_income: effectiveGrossIncome,

    // Operating expenses
    property_taxes: opex.property_taxes,
    insurance: opex.insurance,
    cam_expenses: opex.cam_expenses,
    utilities: opex.utilities,
    management_fee: managementFee,
    repairs_maintenance: opex.repairs_maintenance,
    other_expenses: opex.other_expenses,
    total_operating_expenses: totalOperatingExpenses,

    // NOI
    net_operating_income: netOperatingIncome,

    // Capital
    capital_reserves: capitalItems.capital_reserves,
    tenant_improvements: capitalItems.tenant_improvements,
    leasing_commissions: capitalItems.leasing_commissions,
    total_capital: totalCapital,

    // Cash flow
    cash_flow_before_debt: cashFlowBeforeDebt,
    debt_service: debtService,
    net_cash_flow: netCashFlow,
  };
}

/**
 * Calculate cash flow for entire hold period (all periods)
 */
export function calculateMultiPeriodCashFlow(
  property: PropertyData,
  startDate: Date,
  numPeriods: number,
  periodType: 'monthly' | 'annual',
  opexSchedule: OperatingExpenses[],
  capitalSchedule: CapitalItems[],
  debtServiceAnnual: number = 0,
  vacancyPct: number = 0.05,
  creditLossPct: number = 0.02
): CashFlowPeriod[] {
  const cashFlows: CashFlowPeriod[] = [];
  const monthsIncrement = periodType === 'monthly' ? 1 : 12;
  const debtServicePeriod = periodType === 'monthly' ? debtServiceAnnual / 12 : debtServiceAnnual;

  for (let i = 0; i < numPeriods; i++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + (i * monthsIncrement));

    // Find applicable opex and capital for this period
    const opex = opexSchedule[i] || opexSchedule[0]; // Use first period if not specified
    const capital = capitalSchedule[i] || { period_date: periodDate, capital_reserves: 0, tenant_improvements: 0, leasing_commissions: 0 };

    const cashFlow = calculatePeriodCashFlow(
      property,
      periodDate,
      i + 1,
      opex,
      capital,
      debtServicePeriod,
      vacancyPct,
      creditLossPct
    );

    cashFlows.push(cashFlow);
  }

  return cashFlows;
}

/**
 * Calculate Year 1 NOI (used for cap rate valuation)
 */
export function calculateYear1NOI(cashFlows: CashFlowPeriod[]): number {
  if (cashFlows.length === 0) return 0;

  // Sum first 12 months of NOI (or all periods if less than 12)
  const year1Periods = cashFlows.slice(0, Math.min(12, cashFlows.length));
  return year1Periods.reduce((sum, cf) => sum + cf.net_operating_income, 0);
}

/**
 * Calculate stabilized NOI (typically year 2-5 average, or last year)
 */
export function calculateStabilizedNOI(cashFlows: CashFlowPeriod[], holdPeriodYears: number): number {
  if (cashFlows.length === 0) return 0;

  // Use last year as stabilized (terminal year)
  const lastYearStart = Math.max(0, cashFlows.length - 12);
  const lastYearPeriods = cashFlows.slice(lastYearStart);

  return lastYearPeriods.reduce((sum, cf) => sum + cf.net_operating_income, 0);
}
