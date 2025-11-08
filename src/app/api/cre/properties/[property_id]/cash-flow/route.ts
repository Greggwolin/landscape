/**
 * API Route: Calculate Cash Flow for CRE Property
 *
 * POST /api/cre/properties/[property_id]/cash-flow
 *
 * Calculates monthly or annual cash flow projections for a commercial property
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import {
  calculateMultiPeriodCashFlow,
  type PropertyData,
  type LeaseData,
  type OperatingExpenses,
  type CapitalItems,
} from '@/lib/calculations/cashflow';

type Params = { params: Promise<{ property_id: string }> };

const sql = neon(process.env.DATABASE_URL!);

interface CashFlowRequest {
  start_date?: string; // ISO date string
  num_periods?: number; // Number of periods to calculate
  period_type?: 'monthly' | 'annual';
  vacancy_pct?: number;
  credit_loss_pct?: number;
  debt_service_annual?: number;
}

export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const propertyId = parseInt((await context.params).property_id);

    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    const body: CashFlowRequest = await request.json();

    // Default parameters
    const startDate = body.start_date ? new Date(body.start_date) : new Date();
    const numPeriods = body.num_periods || 120; // 10 years monthly default
    const periodType = body.period_type || 'monthly';
    const vacancyPct = body.vacancy_pct || 0.05;
    const creditLossPct = body.credit_loss_pct || 0.02;
    const debtServiceAnnual = body.debt_service_annual || 0;

    // ========================================================================
    // 1. Fetch Property Data
    // ========================================================================

    const propertyRows = await sql`
      SELECT
        cre_property_id,
        property_name,
        rentable_sf,
        acquisition_price
      FROM landscape.tbl_cre_property
      WHERE cre_property_id = ${propertyId}
    `;

    if (propertyRows.length === 0) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const propertyRow = propertyRows[0];

    // ========================================================================
    // 2. Fetch Active Leases
    // ========================================================================

    const leaseRows = await sql`
      SELECT
        l.lease_id,
        l.space_id,
        l.tenant_id,
        t.tenant_name,
        l.lease_type,
        l.lease_status,
        l.lease_commencement_date,
        l.lease_expiration_date,
        l.leased_sf
      FROM landscape.tbl_cre_lease l
      LEFT JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
      WHERE l.cre_property_id = ${propertyId}
        AND l.lease_status = 'Active'
      ORDER BY l.lease_id
    `;

    // ========================================================================
    // 3. Fetch Base Rent Schedules for Each Lease
    // ========================================================================

    const leases: LeaseData[] = [];

    for (const leaseRow of leaseRows) {
      // Get base rent schedule
      const rentRows = await sql`
        SELECT
          period_start_date,
          period_end_date,
          base_rent_annual,
          base_rent_monthly,
          base_rent_psf_annual
        FROM landscape.tbl_cre_base_rent
        WHERE lease_id = ${leaseRow.lease_id}
        ORDER BY period_start_date
      `;

      // Get escalation
      const escalationRows = await sql`
        SELECT
          escalation_type,
          escalation_pct,
          escalation_frequency,
          cpi_floor_pct,
          cpi_cap_pct
        FROM landscape.tbl_cre_rent_escalation
        WHERE lease_id = ${leaseRow.lease_id}
        LIMIT 1
      `;

      // Get percentage rent (if any)
      const percentageRentRows = await sql`
        SELECT
          breakpoint_amount,
          percentage_rate,
          prior_year_sales
        FROM landscape.tbl_cre_percentage_rent
        WHERE lease_id = ${leaseRow.lease_id}
        LIMIT 1
      `;

      // Get expense recovery
      const recoveryRows = await sql`
        SELECT
          recovery_structure,
          property_tax_recovery_pct,
          insurance_recovery_pct,
          cam_recovery_pct,
          utilities_recovery_pct,
          expense_cap_psf,
          expense_cap_escalation_pct
        FROM landscape.tbl_cre_expense_recovery
        WHERE lease_id = ${leaseRow.lease_id}
        LIMIT 1
      `;

      const lease: LeaseData = {
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
          base_rent_monthly: parseFloat(r.base_rent_monthly || 0),
          base_rent_psf_annual: parseFloat(r.base_rent_psf_annual || 0),
        })),
        escalation: escalationRows.length > 0 ? {
          escalation_type: escalationRows[0].escalation_type as any,
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
          expense_cap_psf: parseFloat(recoveryRows[0].expense_cap_psf || 0),
          expense_cap_escalation_pct: parseFloat(recoveryRows[0].expense_cap_escalation_pct || 0),
        } : {
          recovery_structure: 'Gross',
          property_tax_recovery_pct: 0,
          insurance_recovery_pct: 0,
          cam_recovery_pct: 0,
        },
      };

      leases.push(lease);
    }

    const property: PropertyData = {
      cre_property_id: propertyRow.cre_property_id,
      property_name: propertyRow.property_name,
      rentable_sf: parseFloat(propertyRow.rentable_sf),
      acquisition_price: parseFloat(propertyRow.acquisition_price),
      leases,
    };

    // ========================================================================
    // 4. Fetch Operating Expenses
    // ========================================================================

    // For simplicity, use period 1 opex and apply to all periods
    const opexRows = await sql`
      SELECT
        expense_category,
        budgeted_amount,
        actual_amount,
        amount_psf
      FROM landscape.tbl_cre_operating_expense
      WHERE cre_property_id = ${propertyId}
        AND period_id = 1
    `;

    // Aggregate by category
    const opexByCategory: Record<string, number> = {};
    for (const row of opexRows) {
      opexByCategory[row.expense_category] = parseFloat(row.actual_amount || row.budgeted_amount || 0);
    }

    const monthlyOpex: OperatingExpenses = {
      period_date: startDate,
      property_taxes: (opexByCategory['Property Taxes'] || 0) / 12,
      insurance: (opexByCategory['Property Insurance'] || 0 + opexByCategory['Liability Insurance'] || 0) / 12,
      cam_expenses: (
        (opexByCategory['Landscaping'] || 0) +
        (opexByCategory['Parking Lot Maintenance'] || 0) +
        (opexByCategory['Janitorial - Common Area'] || 0) +
        (opexByCategory['Security'] || 0)
      ) / 12,
      utilities: (
        (opexByCategory['Electricity - Common'] || 0) +
        (opexByCategory['Water/Sewer - Common'] || 0) +
        (opexByCategory['Gas - Common'] || 0)
      ) / 12,
      management_fee_pct: 3.0, // Default 3%
      repairs_maintenance: (
        (opexByCategory['HVAC Maintenance'] || 0) +
        (opexByCategory['Roof Repairs'] || 0) +
        (opexByCategory['General Repairs'] || 0)
      ) / 12,
      other_expenses: (opexByCategory['Marketing'] || 0 + opexByCategory['Legal & Professional'] || 0) / 12,
    };

    const opexSchedule = Array(numPeriods).fill(monthlyOpex);

    // ========================================================================
    // 5. Fetch Capital Items
    // ========================================================================

    const monthlyCapital: CapitalItems = {
      period_date: startDate,
      capital_reserves: 10000, // Default - should fetch from tbl_cre_capital_reserve
      tenant_improvements: 0,
      leasing_commissions: 0,
    };

    const capitalSchedule = Array(numPeriods).fill(monthlyCapital);

    // ========================================================================
    // 6. Calculate Cash Flows
    // ========================================================================

    const cashFlows = calculateMultiPeriodCashFlow(
      property,
      startDate,
      numPeriods,
      periodType,
      opexSchedule,
      capitalSchedule,
      debtServiceAnnual,
      vacancyPct,
      creditLossPct
    );

    // ========================================================================
    // 7. Return Results
    // ========================================================================

    return NextResponse.json({
      property: {
        cre_property_id: property.cre_property_id,
        property_name: property.property_name,
        rentable_sf: property.rentable_sf,
      },
      parameters: {
        start_date: startDate.toISOString(),
        num_periods: numPeriods,
        period_type: periodType,
        vacancy_pct: vacancyPct,
        credit_loss_pct: creditLossPct,
      },
      cash_flows: cashFlows,
      summary: {
        total_periods: cashFlows.length,
        total_noi: cashFlows.reduce((sum, cf) => sum + cf.net_operating_income, 0),
        total_cash_flow: cashFlows.reduce((sum, cf) => sum + cf.net_cash_flow, 0),
        avg_monthly_noi: cashFlows.reduce((sum, cf) => sum + cf.net_operating_income, 0) / cashFlows.length,
      },
    });
  } catch (error: any) {
    console.error('Error calculating cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cash flow', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: Params
) {
  return NextResponse.json({
    message: 'Use POST method to calculate cash flow',
    endpoint: `/api/cre/properties/${params.property_id}/cash-flow`,
    method: 'POST',
    parameters: {
      start_date: 'ISO date string (optional, defaults to today)',
      num_periods: 'number (optional, defaults to 120 months)',
      period_type: '"monthly" | "annual" (optional, defaults to "monthly")',
      vacancy_pct: 'number (optional, defaults to 0.05)',
      credit_loss_pct: 'number (optional, defaults to 0.02)',
      debt_service_annual: 'number (optional, defaults to 0)',
    },
  });
}
