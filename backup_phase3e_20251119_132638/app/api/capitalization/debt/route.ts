/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/capitalization/debt
 * List all debt facilities for a project
 *
 * Query params:
 * - projectId (required): The project ID
 *
 * Response schema translation:
 * - commitment_amount (DB) → loan_amount (API)
 * - interest_rate (DB decimal 0.0575) → interest_rate_pct (API 5.75)
 * - Extract LTV, DSCR from covenants JSONB field
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const facilities = await sql`
      SELECT *
      FROM landscape.tbl_debt_facility
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY created_at DESC
    `;

    // Transform DB schema to component schema - ALL 34 fields
    const transformedFacilities = facilities.map((f: any) => {
      const facilityId = f.facility_id != null ? String(f.facility_id) : null;
      const amountValue = f.loan_amount ?? f.commitment_amount;
      const rawRate =
        f.interest_rate_pct ?? (f.interest_rate != null ? Number(f.interest_rate) * 100 : null);

      return {
        facility_id: facilityId,
        project_id: Number(f.project_id),
        facility_name: f.facility_name,
        lender_name: f.lender_name || null,

        // Basic loan terms
        loan_amount: amountValue != null ? Number(amountValue) : 0,
        interest_rate_pct: (() => {
          if (rawRate == null) return 0;
          const rate = Number(rawRate);
          if (Number.isNaN(rate)) return 0;
          return rate <= 1 ? rate * 100 : rate;
        })(),
      loan_term_years: f.loan_term_years || null,
      amortization_years: f.amortization_years || null,
      is_construction_loan: f.is_construction_loan || false,

      // Rate structure
      rate_type: f.rate_type || 'fixed',
      spread_over_index_bps: f.spread_over_index_bps || null,
      rate_floor_pct: f.rate_floor_pct ? Number(f.rate_floor_pct) : null,
      rate_cap_pct: f.rate_cap_pct ? Number(f.rate_cap_pct) : null,
      index_name: f.index_name || null,
      rate_reset_frequency: f.rate_reset_frequency || null,

      // Underwriting metrics
      ltv_pct: f.ltv_pct ? Number(f.ltv_pct) : null,
      dscr: f.dscr ? Number(f.dscr) : null,

      // Fees
      commitment_fee_pct: f.commitment_fee_pct ? Number(f.commitment_fee_pct) : null,
      extension_fee_bps: f.extension_fee_bps || null,
      prepayment_penalty_years: f.prepayment_penalty_years || null,
      exit_fee_pct: f.exit_fee_pct ? Number(f.exit_fee_pct) : null,

      // Guarantees
      guarantee_type: f.guarantee_type || null,
      guarantor_name: f.guarantor_name || null,

      // Loan covenants
      loan_covenant_dscr_min: f.loan_covenant_dscr_min ? Number(f.loan_covenant_dscr_min) : null,
      loan_covenant_ltv_max: f.loan_covenant_ltv_max ? Number(f.loan_covenant_ltv_max) : null,
      loan_covenant_occupancy_min: f.loan_covenant_occupancy_min ? Number(f.loan_covenant_occupancy_min) : null,
      covenant_test_frequency: f.covenant_test_frequency || 'Quarterly',

      // Reserves
      reserve_requirements: f.reserve_requirements || null,
      replacement_reserve_per_unit: f.replacement_reserve_per_unit ? Number(f.replacement_reserve_per_unit) : null,
      tax_insurance_escrow_months: f.tax_insurance_escrow_months || null,
      initial_reserve_months: f.initial_reserve_months || null,
      recourse_carveout_provisions: f.recourse_carveout_provisions || null,

      // Commitment tracking
      commitment_balance: f.commitment_balance ? Number(f.commitment_balance) : null,
      drawn_to_date: f.drawn_to_date ? Number(f.drawn_to_date) : 0,

      // Extensions
      extension_options: f.extension_options || 0,
      extension_option_years: f.extension_option_years || null,

      // Payment calculations
      monthly_payment: f.monthly_payment ? Number(f.monthly_payment) : null,
      annual_debt_service: f.annual_debt_service ? Number(f.annual_debt_service) : null,

      // Metadata
      created_at: f.created_at,
      updated_at: f.updated_at,
    };
  });

    return NextResponse.json({
      success: true,
      data: transformedFacilities,
    });
  } catch (error) {
    console.error('Error fetching debt facilities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debt facilities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/capitalization/debt
 * Create a new debt facility
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      facility_name,
      facility_type = 'CONSTRUCTION',
      lender_name,
      loan_amount,
      interest_rate_pct,
      amortization_years,
      loan_term_years,
      ltv_pct,
      dscr,
      guarantee_type,
      loan_covenant_dscr_min,
      loan_covenant_ltv_max,
      commitment_date,
      maturity_date,
      notes,
    } = body;

    // Validation
    if (!project_id || !facility_name || !loan_amount || !interest_rate_pct || !loan_term_years) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: project_id, facility_name, loan_amount, interest_rate_pct, loan_term_years',
        },
        { status: 400 }
      );
    }

    if (loan_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'loan_amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (interest_rate_pct <= 0 || interest_rate_pct >= 20) {
      return NextResponse.json(
        { success: false, error: 'interest_rate_pct must be between 0 and 20' },
        { status: 400 }
      );
    }

    if (ltv_pct && (ltv_pct < 0 || ltv_pct > 100)) {
      return NextResponse.json(
        { success: false, error: 'ltv_pct must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Build covenants JSONB object
    const covenants: any = {};
    if (ltv_pct !== undefined && ltv_pct !== null) covenants.ltv_pct = ltv_pct;
    if (dscr !== undefined && dscr !== null) covenants.dscr = dscr;
    if (amortization_years !== undefined && amortization_years !== null) covenants.amortization_years = amortization_years;
    if (guarantee_type) covenants.guarantee_type = guarantee_type;
    if (loan_covenant_dscr_min !== undefined && loan_covenant_dscr_min !== null) covenants.loan_covenant_dscr_min = loan_covenant_dscr_min;
    if (loan_covenant_ltv_max !== undefined && loan_covenant_ltv_max !== null) covenants.loan_covenant_ltv_max = loan_covenant_ltv_max;

    // Convert percentage to decimal for DB storage
    const interestRateDecimal = interest_rate_pct / 100;

    // Calculate maturity date if not provided
    const calculatedMaturityDate = maturity_date || calculateMaturityDate(commitment_date, loan_term_years);

    const result = await sql`
      INSERT INTO landscape.tbl_debt_facility (
        project_id,
        facility_name,
        facility_type,
        lender_name,
        commitment_amount,
        interest_rate,
        interest_calculation,
        payment_frequency,
        commitment_date,
        maturity_date,
        origination_fee_pct,
        covenants,
        notes
      ) VALUES (
        ${project_id},
        ${facility_name},
        ${facility_type},
        ${lender_name || null},
        ${loan_amount},
        ${interestRateDecimal},
        'SIMPLE',
        'MONTHLY',
        ${commitment_date || new Date().toISOString().split('T')[0]},
        ${calculatedMaturityDate},
        0.01,
        ${JSON.stringify(covenants)}::jsonb,
        ${notes || null}
      )
      RETURNING facility_id, project_id, facility_name, commitment_amount, interest_rate, created_at
    `;

    const newFacility = result[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          facility_id: String(newFacility.facility_id),
          project_id: Number(newFacility.project_id),
          facility_name: newFacility.facility_name,
          loan_amount: Number(newFacility.commitment_amount),
          interest_rate_pct: Number(newFacility.interest_rate) * 100,
        },
        message: 'Debt facility created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating debt facility:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Debt facility with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create debt facility' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to calculate loan term in years from dates
 */
function calculateLoanTermYears(commitmentDate: string | null, maturityDate: string | null): number | null {
  if (!commitmentDate || !maturityDate) return null;

  const start = new Date(commitmentDate);
  const end = new Date(maturityDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  return Math.round(diffYears);
}

/**
 * Helper function to calculate maturity date from commitment date and term
 */
function calculateMaturityDate(commitmentDate: string | null, loanTermYears: number): string {
  if (!commitmentDate) {
    const now = new Date();
    now.setFullYear(now.getFullYear() + loanTermYears);
    return now.toISOString().split('T')[0];
  }

  const start = new Date(commitmentDate);
  start.setFullYear(start.getFullYear() + loanTermYears);
  return start.toISOString().split('T')[0];
}
