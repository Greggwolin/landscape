/**
 * API Route: Calculate Investment Metrics for CRE Property
 *
 * POST /api/cre/properties/[property_id]/metrics
 *
 * Calculates IRR, NPV, DSCR, and other return metrics
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
import {
  calculateInvestmentMetrics,
  type DebtAssumptions,
} from '@/lib/calculations/metrics';
import {
  calculateInvestmentMetricsPython,
  checkPythonEngineAvailable,
} from '@/lib/python-calculations';

const sql = neon(process.env.DATABASE_URL!);

interface MetricsRequest {
  // Analysis parameters
  hold_period_years?: number;
  exit_cap_rate?: number;
  discount_rate?: number;

  // Operating assumptions
  vacancy_pct?: number;
  credit_loss_pct?: number;

  // Debt assumptions (optional)
  loan_amount?: number;
  interest_rate?: number;
  amortization_years?: number;
}

/**
 * Fetch complete property data (reusable helper)
 */
async function fetchPropertyData(propertyId: number): Promise<PropertyData | null> {
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
    return null;
  }

  const propertyRow = propertyRows[0];

  // Fetch active leases
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

  const leases: LeaseData[] = [];

  for (const leaseRow of leaseRows) {
    const rentRows = await sql`
      SELECT * FROM landscape.tbl_cre_base_rent
      WHERE lease_id = ${leaseRow.lease_id}
      ORDER BY period_start_date
    `;

    const escalationRows = await sql`
      SELECT * FROM landscape.tbl_cre_rent_escalation
      WHERE lease_id = ${leaseRow.lease_id} LIMIT 1
    `;

    const percentageRentRows = await sql`
      SELECT * FROM landscape.tbl_cre_percentage_rent
      WHERE lease_id = ${leaseRow.lease_id} LIMIT 1
    `;

    const recoveryRows = await sql`
      SELECT * FROM landscape.tbl_cre_expense_recovery
      WHERE lease_id = ${leaseRow.lease_id} LIMIT 1
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
        escalation_type: escalationRows[0].escalation_type as 'Fixed Percentage' | 'CPI' | 'None',
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
  { params }: { params: { property_id: string } }
) {
  try {
    const propertyId = parseInt(params.property_id);

    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    const body: MetricsRequest = await request.json();

    // ========================================================================
    // PYTHON ENGINE - Try Python first for 5-10x performance improvement
    // ========================================================================

    const usePython = process.env.USE_PYTHON_ENGINE !== 'false'; // Default to true

    if (usePython) {
      try {
        const pythonAvailable = await checkPythonEngineAvailable();

        if (pythonAvailable) {
          console.log('[Python] Using Python financial engine for metrics calculation');

          const pythonResult = await calculateInvestmentMetricsPython({
            property_id: propertyId,
            hold_period_years: body.hold_period_years,
            exit_cap_rate: body.exit_cap_rate,
            discount_rate: body.discount_rate,
            vacancy_pct: body.vacancy_pct,
            credit_loss_pct: body.credit_loss_pct,
            loan_amount: body.loan_amount,
            interest_rate: body.interest_rate,
            amortization_years: body.amortization_years,
          });

          return NextResponse.json({
            ...pythonResult,
            calculation_engine: 'python',  // Indicate which engine was used
          });
        } else {
          console.warn('[Python] Python engine not available, falling back to TypeScript');
        }
      } catch (pythonError: unknown) {
        const error = pythonError as Error;
        console.error('[Python] Error using Python engine, falling back to TypeScript:', error.message);
        // Fall through to TypeScript implementation
      }
    }

    // ========================================================================
    // TYPESCRIPT ENGINE - Fallback implementation (will be deprecated)
    // ========================================================================

    console.log('[TypeScript] Using TypeScript financial engine (legacy)');

    // Default parameters
    const holdPeriodYears = body.hold_period_years || 10;
    const exitCapRate = body.exit_cap_rate || 0.065; // 6.5% default
    const discountRate = body.discount_rate || 0.10; // 10% default
    const vacancyPct = body.vacancy_pct || 0.05;
    const creditLossPct = body.credit_loss_pct || 0.02;

    // Fetch property data
    const property = await fetchPropertyData(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Build operating expenses (simplified - using defaults)
    const monthlyOpex: OperatingExpenses = {
      period_date: new Date(),
      property_taxes: (property.acquisition_price * 0.0115) / 12, // 1.15% property tax rate
      insurance: (property.rentable_sf * 0.50) / 12, // $0.50/SF/year
      cam_expenses: (property.rentable_sf * 2.50) / 12, // $2.50/SF/year
      utilities: (property.rentable_sf * 1.00) / 12, // $1.00/SF/year
      management_fee_pct: 3.0,
      repairs_maintenance: (property.rentable_sf * 0.75) / 12, // $0.75/SF/year
      other_expenses: 5000 / 12,
    };

    const numPeriods = holdPeriodYears * 12; // Monthly periods
    const opexSchedule = Array(numPeriods).fill(monthlyOpex);

    const monthlyCapital: CapitalItems = {
      period_date: new Date(),
      capital_reserves: (property.rentable_sf * 0.25) / 12, // $0.25/SF/year
      tenant_improvements: 0,
      leasing_commissions: 0,
    };

    const capitalSchedule = Array(numPeriods).fill(monthlyCapital);

    // Debt assumptions
    let debtAssumptions: DebtAssumptions | undefined;
    let annualDebtService = 0;

    if (body.loan_amount && body.interest_rate && body.amortization_years) {
      const monthlyRate = body.interest_rate / 12;
      const numPayments = body.amortization_years * 12;
      const monthlyPayment =
        body.loan_amount *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      annualDebtService = monthlyPayment * 12;

      debtAssumptions = {
        loan_amount: body.loan_amount,
        interest_rate: body.interest_rate,
        amortization_years: body.amortization_years,
        annual_debt_service: annualDebtService,
      };
    }

    // Calculate cash flows
    const cashFlows = calculateMultiPeriodCashFlow(
      property,
      new Date(),
      numPeriods,
      'monthly',
      opexSchedule,
      capitalSchedule,
      annualDebtService,
      vacancyPct,
      creditLossPct
    );

    // Calculate investment metrics
    const metrics = calculateInvestmentMetrics(
      cashFlows,
      property.acquisition_price,
      exitCapRate,
      debtAssumptions,
      discountRate
    );

    // Return results
    return NextResponse.json({
      calculation_engine: 'typescript',  // Indicate TypeScript engine was used
      property: {
        cre_property_id: property.cre_property_id,
        property_name: property.property_name,
        rentable_sf: property.rentable_sf,
        acquisition_price: property.acquisition_price,
      },
      assumptions: {
        hold_period_years: holdPeriodYears,
        exit_cap_rate: exitCapRate,
        discount_rate: discountRate,
        vacancy_pct: vacancyPct,
        credit_loss_pct: creditLossPct,
        debt: debtAssumptions || null,
      },
      metrics: {
        // Investment summary
        acquisition_price: metrics.acquisition_price,
        total_equity_invested: metrics.total_equity_invested,
        debt_amount: metrics.debt_amount,

        // Exit assumptions
        exit_cap_rate: metrics.exit_cap_rate,
        terminal_noi: metrics.terminal_noi,
        exit_value: metrics.exit_value,
        net_reversion: metrics.net_reversion,

        // Return metrics
        levered_irr: metrics.irr,
        levered_irr_pct: `${(metrics.irr * 100).toFixed(2)}%`,
        unlevered_irr: metrics.unlevered_irr,
        unlevered_irr_pct: `${(metrics.unlevered_irr * 100).toFixed(2)}%`,

        npv: metrics.npv,
        equity_multiple: metrics.equity_multiple,
        cash_on_cash_year_1: metrics.cash_on_cash_year_1,
        cash_on_cash_year_1_pct: `${(metrics.cash_on_cash_year_1 * 100).toFixed(2)}%`,

        avg_dscr: metrics.avg_dscr,

        // Cash flow totals
        total_cash_distributed: metrics.total_cash_distributed,
        total_noi: metrics.total_noi,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error calculating investment metrics:', err);
    return NextResponse.json(
      { error: 'Failed to calculate metrics', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { property_id: string } }
) {
  return NextResponse.json({
    message: 'Use POST method to calculate investment metrics',
    endpoint: `/api/cre/properties/${params.property_id}/metrics`,
    method: 'POST',
    parameters: {
      hold_period_years: 'number (optional, defaults to 10)',
      exit_cap_rate: 'number (optional, defaults to 0.065)',
      discount_rate: 'number (optional, defaults to 0.10)',
      vacancy_pct: 'number (optional, defaults to 0.05)',
      credit_loss_pct: 'number (optional, defaults to 0.02)',
      loan_amount: 'number (optional)',
      interest_rate: 'number (optional)',
      amortization_years: 'number (optional)',
    },
  });
}
