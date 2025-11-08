/**
 * API Route: Run Sensitivity Analysis on CRE Property
 *
 * POST /api/cre/properties/[property_id]/sensitivity
 *
 * Tests key assumptions by varying ±10% and ±20%
 * Ranks assumptions by IRR impact to determine criticality
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import {
  runFullSensitivityAnalysis,
  groupByCriticality,
  generateMilestoneRecommendations,
  calculateVarianceExplained,
  type BaselineAssumptions,
} from '@/lib/calculations/sensitivity';
import type { PropertyData, LeaseData } from '@/lib/calculations/cashflow';

type Params = { params: Promise<{ property_id: string }> };

const sql = neon(process.env.DATABASE_URL!);

interface SensitivityRequest {
  hold_period_years?: number;
  exit_cap_rate?: number;

  // Override baseline assumptions (optional)
  baseline_assumptions?: Partial<BaselineAssumptions>;

  // Debt assumptions
  loan_amount?: number;
  interest_rate?: number;
  amortization_years?: number;
}

/**
 * Fetch property data (same as metrics route)
 */
async function fetchPropertyData(propertyId: number): Promise<PropertyData | null> {
  const propertyRows = await sql`
    SELECT cre_property_id, property_name, rentable_sf, acquisition_price
    FROM landscape.tbl_cre_property
    WHERE cre_property_id = ${propertyId}
  `;

  if (propertyRows.length === 0) return null;

  const propertyRow = propertyRows[0];

  const leaseRows = await sql`
    SELECT l.lease_id, l.space_id, l.tenant_id, t.tenant_name,
           l.lease_type, l.lease_status, l.lease_commencement_date,
           l.lease_expiration_date, l.leased_sf
    FROM landscape.tbl_cre_lease l
    LEFT JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
    WHERE l.cre_property_id = ${propertyId} AND l.lease_status = 'Active'
  `;

  const leases: LeaseData[] = [];

  for (const leaseRow of leaseRows) {
    const rentRows = await sql`
      SELECT * FROM landscape.tbl_cre_base_rent WHERE lease_id = ${leaseRow.lease_id}
    `;

    const escalationRows = await sql`
      SELECT * FROM landscape.tbl_cre_rent_escalation WHERE lease_id = ${leaseRow.lease_id} LIMIT 1
    `;

    const percentageRentRows = await sql`
      SELECT * FROM landscape.tbl_cre_percentage_rent WHERE lease_id = ${leaseRow.lease_id} LIMIT 1
    `;

    const recoveryRows = await sql`
      SELECT * FROM landscape.tbl_cre_expense_recovery WHERE lease_id = ${leaseRow.lease_id} LIMIT 1
    `;

    leases.push({
      lease_id: leaseRow.lease_id,
      space_id: leaseRow.space_id,
      tenant_id: leaseRow.tenant_id,
      tenant_name: leaseRow.tenant_name || 'Unknown',
      lease_type: leaseRow.lease_type as LeaseData['lease_type'],
      lease_status: leaseRow.lease_status,
      lease_commencement_date: new Date(leaseRow.lease_commencement_date),
      lease_expiration_date: new Date(leaseRow.lease_expiration_date),
      leased_sf: parseFloat(leaseRow.leased_sf),
      base_rent: rentRows.map(r => ({
        period_start_date: new Date(r.period_start_date),
        period_end_date: new Date(r.period_end_date),
        base_rent_annual: parseFloat(r.base_rent_annual || 0),
        base_rent_monthly: parseFloat(r.base_rent_monthly || r.base_rent_annual / 12 || 0),
        base_rent_psf_annual: parseFloat(r.base_rent_psf_annual || 0),
      })),
      escalation: escalationRows.length > 0 ? {
        escalation_type: escalationRows[0].escalation_type,
        escalation_pct: parseFloat(escalationRows[0].escalation_pct || 0),
        escalation_frequency: escalationRows[0].escalation_frequency,
        cpi_floor_pct: parseFloat(escalationRows[0].cpi_floor_pct || 0),
        cpi_cap_pct: parseFloat(escalationRows[0].cpi_cap_pct || 0),
      } : undefined,
      percentage_rent: percentageRentRows.length > 0 ? {
        breakpoint_amount: parseFloat(percentageRentRows[0].breakpoint_amount),
        percentage_rate: parseFloat(percentageRentRows[0].percentage_rate),
        prior_year_sales: parseFloat(percentageRentRows[0].prior_year_sales || 0),
      } : undefined,
      expense_recovery: recoveryRows.length > 0 ? {
        recovery_structure: recoveryRows[0].recovery_structure,
        property_tax_recovery_pct: parseFloat(recoveryRows[0].property_tax_recovery_pct || 0),
        insurance_recovery_pct: parseFloat(recoveryRows[0].insurance_recovery_pct || 0),
        cam_recovery_pct: parseFloat(recoveryRows[0].cam_recovery_pct || 0),
        utilities_recovery_pct: parseFloat(recoveryRows[0].utilities_recovery_pct || 0),
      } : {
        recovery_structure: 'Gross',
        property_tax_recovery_pct: 0,
        insurance_recovery_pct: 0,
        cam_recovery_pct: 0,
      },
    });
  }

  return {
    cre_property_id: propertyRow.cre_property_id,
    property_name: propertyRow.property_name,
    rentable_sf: parseFloat(propertyRow.rentable_sf),
    acquisition_price: parseFloat(propertyRow.acquisition_price),
    leases,
  };
}

export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const propertyId = parseInt((await context.params).property_id);

    if (isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
    }

    const body: SensitivityRequest = await request.json();

    const holdPeriodYears = body.hold_period_years || 10;
    const exitCapRate = body.exit_cap_rate || 0.065;

    // Fetch property data
    const property = await fetchPropertyData(propertyId);

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Calculate blended rent PSF across all leases
    const totalLeasedSF = property.leases.reduce((sum, l) => sum + l.leased_sf, 0);
    const weightedRentSum = property.leases.reduce((sum, l) => {
      const currentRent = l.base_rent[0]?.base_rent_psf_annual || 0;
      return sum + (currentRent * l.leased_sf);
    }, 0);
    const blendedRentPSF = weightedRentSum / totalLeasedSF;

    // Default baseline assumptions
    const baselineAssumptions: BaselineAssumptions = {
      // Revenue
      base_rent_psf: body.baseline_assumptions?.base_rent_psf || blendedRentPSF || 25.0,
      rent_escalation_pct: body.baseline_assumptions?.rent_escalation_pct || 2.5,
      vacancy_pct: body.baseline_assumptions?.vacancy_pct || 0.05,
      credit_loss_pct: body.baseline_assumptions?.credit_loss_pct || 0.02,

      // Expenses
      property_tax_annual: body.baseline_assumptions?.property_tax_annual || property.acquisition_price * 0.0115,
      insurance_annual: body.baseline_assumptions?.insurance_annual || property.rentable_sf * 0.50,
      cam_annual: body.baseline_assumptions?.cam_annual || property.rentable_sf * 2.50,
      utilities_annual: body.baseline_assumptions?.utilities_annual || property.rentable_sf * 1.00,
      management_fee_pct: body.baseline_assumptions?.management_fee_pct || 3.0,
      repairs_maintenance_annual: body.baseline_assumptions?.repairs_maintenance_annual || property.rentable_sf * 0.75,

      // Capital
      capital_reserves_annual: body.baseline_assumptions?.capital_reserves_annual || property.rentable_sf * 0.25,
      ti_allowance_psf: body.baseline_assumptions?.ti_allowance_psf || 35.0,
      leasing_commission_pct: body.baseline_assumptions?.leasing_commission_pct || 4.0,

      // Exit
      exit_cap_rate: exitCapRate,
      hold_period_years: holdPeriodYears,
    };

    // Debt assumptions
    let debtAssumptions = undefined;
    if (body.loan_amount && body.interest_rate && body.amortization_years) {
      const monthlyRate = body.interest_rate / 12;
      const numPayments = body.amortization_years * 12;
      const monthlyPayment =
        body.loan_amount *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      debtAssumptions = {
        loan_amount: body.loan_amount,
        interest_rate: body.interest_rate,
        amortization_years: body.amortization_years,
        annual_debt_service: monthlyPayment * 12,
      };
    }

    // Run full sensitivity analysis
    const numPeriods = holdPeriodYears * 12;
    const results = runFullSensitivityAnalysis(
      property,
      baselineAssumptions,
      numPeriods,
      property.acquisition_price,
      debtAssumptions
    );

    // Group by criticality
    const grouped = groupByCriticality(results);

    // Generate milestone recommendations
    const milestones = generateMilestoneRecommendations(results);

    // Calculate variance explained by top 5
    const varianceExplained = calculateVarianceExplained(results, 5);

    // Return results
    return NextResponse.json({
      property: {
        cre_property_id: property.cre_property_id,
        property_name: property.property_name,
        rentable_sf: property.rentable_sf,
        acquisition_price: property.acquisition_price,
      },
      baseline_assumptions: baselineAssumptions,
      baseline_irr: results[0]?.baseline_irr || 0,
      baseline_irr_pct: `${((results[0]?.baseline_irr || 0) * 100).toFixed(2)}%`,

      // All sensitivity results (sorted by impact)
      sensitivity_results: results.map(r => ({
        assumption_name: r.assumption_name,
        category: r.assumption_category,
        baseline_value: r.baseline_value,
        scenarios: {
          neg_20: {
            value: r.scenario_neg_20.adjusted_value,
            irr: r.scenario_neg_20.irr,
            irr_pct: `${(r.scenario_neg_20.irr * 100).toFixed(2)}%`,
            impact_bps: r.scenario_neg_20.irr_impact_bps,
          },
          neg_10: {
            value: r.scenario_neg_10.adjusted_value,
            irr: r.scenario_neg_10.irr,
            irr_pct: `${(r.scenario_neg_10.irr * 100).toFixed(2)}%`,
            impact_bps: r.scenario_neg_10.irr_impact_bps,
          },
          pos_10: {
            value: r.scenario_pos_10.adjusted_value,
            irr: r.scenario_pos_10.irr,
            irr_pct: `${(r.scenario_pos_10.irr * 100).toFixed(2)}%`,
            impact_bps: r.scenario_pos_10.irr_impact_bps,
          },
          pos_20: {
            value: r.scenario_pos_20.adjusted_value,
            irr: r.scenario_pos_20.irr,
            irr_pct: `${(r.scenario_pos_20.irr * 100).toFixed(2)}%`,
            impact_bps: r.scenario_pos_20.irr_impact_bps,
          },
        },
        avg_impact_bps: r.avg_impact_bps,
        max_impact_bps: r.max_impact_bps,
        criticality: r.criticality_level,
      })),

      // Grouped by criticality
      by_criticality: {
        critical: grouped.critical.map(r => r.assumption_name),
        high: grouped.high.map(r => r.assumption_name),
        medium: grouped.medium.map(r => r.assumption_name),
        low: grouped.low.map(r => r.assumption_name),
      },

      // Milestone recommendations
      milestone_recommendations: {
        napkin_milestone: {
          description: 'CRITICAL assumptions only (>500 bps impact)',
          assumptions: milestones.napkin,
          count: milestones.napkin.length,
        },
        envelope_milestone: {
          description: 'CRITICAL + HIGH assumptions (>200 bps impact)',
          assumptions: milestones.envelope,
          count: milestones.envelope.length,
        },
        memo_milestone: {
          description: 'CRITICAL + HIGH + MEDIUM assumptions (>50 bps impact)',
          assumptions: milestones.memo,
          count: milestones.memo.length,
        },
        kitchen_sink_milestone: {
          description: 'All assumptions (complete ARGUS-level)',
          assumptions: milestones.kitchen_sink,
          count: milestones.kitchen_sink.length,
        },
      },

      // Top 5 variance analysis
      top_5_analysis: {
        assumptions: varianceExplained.topAssumptions,
        percentage_of_variance_explained: `${varianceExplained.percentageExplained.toFixed(1)}%`,
        top_5_variance_bps: varianceExplained.topNVariance,
        total_variance_bps: varianceExplained.totalVariance,
      },
    });
  } catch (error: any) {
    console.error('Error running sensitivity analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run sensitivity analysis', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: Params
) {
  return NextResponse.json({
    message: 'Use POST method to run sensitivity analysis',
    endpoint: `/api/cre/properties/${params.property_id}/sensitivity`,
    method: 'POST',
    parameters: {
      hold_period_years: 'number (optional, defaults to 10)',
      exit_cap_rate: 'number (optional, defaults to 0.065)',
      baseline_assumptions: 'object (optional, override baseline assumptions)',
      loan_amount: 'number (optional)',
      interest_rate: 'number (optional)',
      amortization_years: 'number (optional)',
    },
    description: 'Tests each key assumption by varying ±10% and ±20%, measures IRR impact, and ranks by criticality',
  });
}
