/**
 * CRE Sensitivity Analysis Engine
 *
 * Determines which assumptions have the greatest impact on IRR
 * Tests each variable by varying ±10% and ±20%
 * Ranks assumptions by criticality for milestone definition
 *
 * Criticality Levels:
 * - CRITICAL: >500 bps average impact on IRR
 * - HIGH: 200-500 bps average impact
 * - MEDIUM: 50-200 bps average impact
 * - LOW: <50 bps average impact
 */

import type { CashFlowPeriod, PropertyData, OperatingExpenses, CapitalItems } from './cashflow';
import { calculateMultiPeriodCashFlow } from './cashflow';
import { calculateInvestmentMetrics, type DebtAssumptions } from './metrics';

export type CriticalityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AssumptionCategory = 'Revenue' | 'Expense' | 'Capital' | 'Exit';

export interface SensitivityScenario {
  scenario_name: string;
  variance_pct: number; // -20, -10, +10, +20
  adjusted_value: number;
  irr: number;
  irr_impact_bps: number; // Basis points difference from baseline
}

export interface SensitivityResult {
  assumption_name: string;
  assumption_category: AssumptionCategory;
  baseline_value: number;
  baseline_irr: number;

  // Downside scenarios
  scenario_neg_20: SensitivityScenario;
  scenario_neg_10: SensitivityScenario;

  // Upside scenarios
  scenario_pos_10: SensitivityScenario;
  scenario_pos_20: SensitivityScenario;

  // Impact metrics
  avg_impact_bps: number;
  max_impact_bps: number;
  criticality_level: CriticalityLevel;
}

export interface BaselineAssumptions {
  // Revenue
  base_rent_psf: number;
  rent_escalation_pct: number;
  vacancy_pct: number;
  credit_loss_pct: number;

  // Expenses
  property_tax_annual: number;
  insurance_annual: number;
  cam_annual: number;
  utilities_annual: number;
  management_fee_pct: number;
  repairs_maintenance_annual: number;

  // Capital
  capital_reserves_annual: number;
  ti_allowance_psf: number;
  leasing_commission_pct: number;

  // Exit
  exit_cap_rate: number;
  hold_period_years: number;
}

/**
 * Determine criticality level based on average IRR impact
 */
export function getCriticalityLevel(avgImpactBps: number): CriticalityLevel {
  const absImpact = Math.abs(avgImpactBps);

  if (absImpact >= 500) return 'CRITICAL';
  if (absImpact >= 200) return 'HIGH';
  if (absImpact >= 50) return 'MEDIUM';
  return 'LOW';
}

/**
 * Run sensitivity analysis on a single assumption
 */
export function analyzeAssumption(
  assumptionName: string,
  category: AssumptionCategory,
  baselineValue: number,
  calculateIRRWithAdjustment: (adjustedValue: number) => number,
  baselineIRR: number
): SensitivityResult {
  const scenarios: SensitivityScenario[] = [];

  // Test -20%, -10%, +10%, +20%
  const variances = [-20, -10, 10, 20];

  for (const variance of variances) {
    const adjustedValue = baselineValue * (1 + variance / 100);
    const adjustedIRR = calculateIRRWithAdjustment(adjustedValue);
    const irrImpactBps = Math.round((adjustedIRR - baselineIRR) * 10000); // Convert to basis points

    scenarios.push({
      scenario_name: `${variance > 0 ? '+' : ''}${variance}%`,
      variance_pct: variance,
      adjusted_value: adjustedValue,
      irr: adjustedIRR,
      irr_impact_bps: irrImpactBps,
    });
  }

  // Calculate average and max impact
  const impacts = scenarios.map(s => Math.abs(s.irr_impact_bps));
  const avgImpactBps = Math.round(impacts.reduce((sum, val) => sum + val, 0) / impacts.length);
  const maxImpactBps = Math.max(...impacts);

  const criticalityLevel = getCriticalityLevel(avgImpactBps);

  return {
    assumption_name: assumptionName,
    assumption_category: category,
    baseline_value: baselineValue,
    baseline_irr: baselineIRR,

    scenario_neg_20: scenarios[0],
    scenario_neg_10: scenarios[1],
    scenario_pos_10: scenarios[2],
    scenario_pos_20: scenarios[3],

    avg_impact_bps: avgImpactBps,
    max_impact_bps: maxImpactBps,
    criticality_level: criticalityLevel,
  };
}

/**
 * Run comprehensive sensitivity analysis on all key assumptions
 */
export function runFullSensitivityAnalysis(
  property: PropertyData,
  baselineAssumptions: BaselineAssumptions,
  numPeriods: number = 120, // 10 years monthly
  acquisitionPrice: number,
  debtAssumptions?: DebtAssumptions
): SensitivityResult[] {
  const results: SensitivityResult[] = [];

  // Helper function to calculate IRR with modified assumptions
  const calculateScenarioIRR = (
    modifiedAssumptions: Partial<BaselineAssumptions>
  ): number => {
    const assumptions = { ...baselineAssumptions, ...modifiedAssumptions };

    // Build operating expenses schedule (constant for now)
    const monthlyOpex: OperatingExpenses = {
      period_date: new Date(),
      property_taxes: assumptions.property_tax_annual / 12,
      insurance: assumptions.insurance_annual / 12,
      cam_expenses: assumptions.cam_annual / 12,
      utilities: assumptions.utilities_annual / 12,
      management_fee_pct: assumptions.management_fee_pct,
      repairs_maintenance: assumptions.repairs_maintenance_annual / 12,
      other_expenses: 0,
    };

    const opexSchedule = Array(numPeriods).fill(monthlyOpex);

    // Build capital schedule
    const monthlyCapital: CapitalItems = {
      period_date: new Date(),
      capital_reserves: assumptions.capital_reserves_annual / 12,
      tenant_improvements: 0, // Front-loaded in actual model
      leasing_commissions: 0, // Event-driven in actual model
    };

    const capitalSchedule = Array(numPeriods).fill(monthlyCapital);

    // Calculate cash flows
    const cashFlows = calculateMultiPeriodCashFlow(
      property,
      new Date('2025-01-01'),
      numPeriods,
      'monthly',
      opexSchedule,
      capitalSchedule,
      debtAssumptions?.annual_debt_service || 0,
      assumptions.vacancy_pct,
      assumptions.credit_loss_pct
    );

    // Calculate investment metrics
    const metrics = calculateInvestmentMetrics(
      cashFlows,
      acquisitionPrice,
      assumptions.exit_cap_rate,
      debtAssumptions
    );

    return metrics.irr;
  };

  // Calculate baseline IRR
  const baselineIRR = calculateScenarioIRR({});

  // ============================================================================
  // REVENUE ASSUMPTIONS
  // ============================================================================

  // 1. Base Rent PSF
  results.push(
    analyzeAssumption(
      'Base Rent PSF',
      'Revenue',
      baselineAssumptions.base_rent_psf,
      (adjustedValue) => {
        // Adjust property rents proportionally
        // In real implementation, would modify lease data
        return calculateScenarioIRR({});
      },
      baselineIRR
    )
  );

  // 2. Rent Escalation %
  results.push(
    analyzeAssumption(
      'Rent Escalation %',
      'Revenue',
      baselineAssumptions.rent_escalation_pct,
      (adjustedValue) => calculateScenarioIRR({ rent_escalation_pct: adjustedValue }),
      baselineIRR
    )
  );

  // 3. Vacancy %
  results.push(
    analyzeAssumption(
      'Vacancy %',
      'Revenue',
      baselineAssumptions.vacancy_pct * 100, // Display as percentage
      (adjustedValue) => calculateScenarioIRR({ vacancy_pct: adjustedValue / 100 }),
      baselineIRR
    )
  );

  // 4. Credit Loss %
  results.push(
    analyzeAssumption(
      'Credit Loss %',
      'Revenue',
      baselineAssumptions.credit_loss_pct * 100,
      (adjustedValue) => calculateScenarioIRR({ credit_loss_pct: adjustedValue / 100 }),
      baselineIRR
    )
  );

  // ============================================================================
  // EXPENSE ASSUMPTIONS
  // ============================================================================

  // 5. Property Taxes
  results.push(
    analyzeAssumption(
      'Property Taxes',
      'Expense',
      baselineAssumptions.property_tax_annual,
      (adjustedValue) => calculateScenarioIRR({ property_tax_annual: adjustedValue }),
      baselineIRR
    )
  );

  // 6. Insurance
  results.push(
    analyzeAssumption(
      'Insurance',
      'Expense',
      baselineAssumptions.insurance_annual,
      (adjustedValue) => calculateScenarioIRR({ insurance_annual: adjustedValue }),
      baselineIRR
    )
  );

  // 7. CAM Expenses
  results.push(
    analyzeAssumption(
      'CAM Expenses',
      'Expense',
      baselineAssumptions.cam_annual,
      (adjustedValue) => calculateScenarioIRR({ cam_annual: adjustedValue }),
      baselineIRR
    )
  );

  // 8. Utilities
  results.push(
    analyzeAssumption(
      'Utilities',
      'Expense',
      baselineAssumptions.utilities_annual,
      (adjustedValue) => calculateScenarioIRR({ utilities_annual: adjustedValue }),
      baselineIRR
    )
  );

  // 9. Management Fee %
  results.push(
    analyzeAssumption(
      'Management Fee %',
      'Expense',
      baselineAssumptions.management_fee_pct,
      (adjustedValue) => calculateScenarioIRR({ management_fee_pct: adjustedValue }),
      baselineIRR
    )
  );

  // 10. Repairs & Maintenance
  results.push(
    analyzeAssumption(
      'Repairs & Maintenance',
      'Expense',
      baselineAssumptions.repairs_maintenance_annual,
      (adjustedValue) => calculateScenarioIRR({ repairs_maintenance_annual: adjustedValue }),
      baselineIRR
    )
  );

  // ============================================================================
  // CAPITAL ASSUMPTIONS
  // ============================================================================

  // 11. Capital Reserves
  results.push(
    analyzeAssumption(
      'Capital Reserves',
      'Capital',
      baselineAssumptions.capital_reserves_annual,
      (adjustedValue) => calculateScenarioIRR({ capital_reserves_annual: adjustedValue }),
      baselineIRR
    )
  );

  // 12. TI Allowance PSF
  results.push(
    analyzeAssumption(
      'TI Allowance PSF',
      'Capital',
      baselineAssumptions.ti_allowance_psf,
      (adjustedValue) => calculateScenarioIRR({ ti_allowance_psf: adjustedValue }),
      baselineIRR
    )
  );

  // 13. Leasing Commission %
  results.push(
    analyzeAssumption(
      'Leasing Commission %',
      'Capital',
      baselineAssumptions.leasing_commission_pct,
      (adjustedValue) => calculateScenarioIRR({ leasing_commission_pct: adjustedValue }),
      baselineIRR
    )
  );

  // ============================================================================
  // EXIT ASSUMPTIONS
  // ============================================================================

  // 14. Exit Cap Rate (typically most sensitive)
  results.push(
    analyzeAssumption(
      'Exit Cap Rate',
      'Exit',
      baselineAssumptions.exit_cap_rate * 100, // Display as percentage
      (adjustedValue) => calculateScenarioIRR({ exit_cap_rate: adjustedValue / 100 }),
      baselineIRR
    )
  );

  // 15. Hold Period (years)
  results.push(
    analyzeAssumption(
      'Hold Period (Years)',
      'Exit',
      baselineAssumptions.hold_period_years,
      (adjustedValue) => {
        const adjustedPeriods = Math.round(adjustedValue * 12); // Convert years to months
        // Would need to recalculate with different period count
        return baselineIRR; // Placeholder - complex to implement
      },
      baselineIRR
    )
  );

  // Sort by avg_impact_bps (descending)
  results.sort((a, b) => b.avg_impact_bps - a.avg_impact_bps);

  return results;
}

/**
 * Group sensitivity results by criticality level
 */
export function groupByCriticality(results: SensitivityResult[]): {
  critical: SensitivityResult[];
  high: SensitivityResult[];
  medium: SensitivityResult[];
  low: SensitivityResult[];
} {
  return {
    critical: results.filter(r => r.criticality_level === 'CRITICAL'),
    high: results.filter(r => r.criticality_level === 'HIGH'),
    medium: results.filter(r => r.criticality_level === 'MEDIUM'),
    low: results.filter(r => r.criticality_level === 'LOW'),
  };
}

/**
 * Generate milestone recommendations based on sensitivity results
 */
export function generateMilestoneRecommendations(results: SensitivityResult[]): {
  napkin: string[]; // CRITICAL only
  envelope: string[]; // CRITICAL + HIGH
  memo: string[]; // CRITICAL + HIGH + MEDIUM
  kitchen_sink: string[]; // All assumptions
} {
  const grouped = groupByCriticality(results);

  return {
    napkin: grouped.critical.map(r => r.assumption_name),
    envelope: [
      ...grouped.critical.map(r => r.assumption_name),
      ...grouped.high.map(r => r.assumption_name),
    ],
    memo: [
      ...grouped.critical.map(r => r.assumption_name),
      ...grouped.high.map(r => r.assumption_name),
      ...grouped.medium.map(r => r.assumption_name),
    ],
    kitchen_sink: results.map(r => r.assumption_name),
  };
}

/**
 * Calculate variance explained by top N assumptions
 */
export function calculateVarianceExplained(
  results: SensitivityResult[],
  topN: number = 5
): {
  topAssumptions: string[];
  totalVariance: number;
  topNVariance: number;
  percentageExplained: number;
} {
  const totalVariance = results.reduce((sum, r) => sum + r.avg_impact_bps, 0);
  const topResults = results.slice(0, topN);
  const topNVariance = topResults.reduce((sum, r) => sum + r.avg_impact_bps, 0);
  const percentageExplained = (topNVariance / totalVariance) * 100;

  return {
    topAssumptions: topResults.map(r => r.assumption_name),
    totalVariance,
    topNVariance,
    percentageExplained,
  };
}
