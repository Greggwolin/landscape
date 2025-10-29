/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ facility_id: string }> }
) {
  try {
    const { facility_id } = await context.params;
    if (!/^[0-9]+$/.test(facility_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid facility_id parameter' },
        { status: 400 }
      );
    }
    const facilityIdText = facility_id;
    const body = await request.json();

    // Discover existing column names to support legacy/new schemas
    const columnRecords = await sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'landscape'
        AND table_name = 'tbl_debt_facility'
    `;
    const existingColumns = new Set(columnRecords.map((row) => row.column_name));

    const identifierColumns = ['facility_id'].filter((column) =>
      existingColumns.has(column)
    );

    if (identifierColumns.length === 0) {
      throw new Error('tbl_debt_facility identifier column not found');
    }

    // Build the SET clause dynamically - ALL 34 fields
    const updates: Array<{ column: string; value: unknown; useParam: boolean }> = [];
    const fieldMapping: Record<string, string> = {
      // Basic information
      facility_name: 'facility_name',
      lender_name: 'lender_name',

      // Basic loan terms
      loan_amount: 'loan_amount',
      interest_rate_pct: 'interest_rate_pct',
      loan_term_years: 'loan_term_years',
      amortization_years: 'amortization_years',
      is_construction_loan: 'is_construction_loan',

      // Rate structure
      rate_type: 'rate_type',
      spread_over_index_bps: 'spread_over_index_bps',
      rate_floor_pct: 'rate_floor_pct',
      rate_cap_pct: 'rate_cap_pct',
      index_name: 'index_name',
      rate_reset_frequency: 'rate_reset_frequency',

      // Underwriting metrics
      ltv_pct: 'ltv_pct',
      dscr: 'dscr',

      // Fees
      commitment_fee_pct: 'commitment_fee_pct',
      extension_fee_bps: 'extension_fee_bps',
      prepayment_penalty_years: 'prepayment_penalty_years',
      exit_fee_pct: 'exit_fee_pct',

      // Guarantees
      guarantee_type: 'guarantee_type',
      guarantor_name: 'guarantor_name',

      // Loan covenants
      loan_covenant_dscr_min: 'loan_covenant_dscr_min',
      loan_covenant_ltv_max: 'loan_covenant_ltv_max',
      loan_covenant_occupancy_min: 'loan_covenant_occupancy_min',
      covenant_test_frequency: 'covenant_test_frequency',

      // Reserves
      replacement_reserve_per_unit: 'replacement_reserve_per_unit',
      tax_insurance_escrow_months: 'tax_insurance_escrow_months',
      initial_reserve_months: 'initial_reserve_months',
      recourse_carveout_provisions: 'recourse_carveout_provisions',

      // Commitment tracking
      commitment_balance: 'commitment_balance',
      drawn_to_date: 'drawn_to_date',

      // Extensions
      extension_options: 'extension_options',
      extension_option_years: 'extension_option_years',

      // Payment calculations
      monthly_payment: 'monthly_payment',
      annual_debt_service: 'annual_debt_service',
    };

    const enqueueUpdate = (column: string, value: unknown) => {
      if (!existingColumns.has(column)) return;
      if (value === null) {
        updates.push({ column, value: null, useParam: false });
      } else {
        updates.push({ column, value, useParam: true });
      }
    };

    for (const [apiField, dbField] of Object.entries(fieldMapping)) {
      if (body[apiField] !== undefined) {
        const value = body[apiField];
        let targetColumn = dbField;

        // Handle legacy/new column naming differences
        if (apiField === 'loan_amount') {
          if (!existingColumns.has(targetColumn) && existingColumns.has('commitment_amount')) {
            targetColumn = 'commitment_amount';
          }
        }

        if (apiField === 'interest_rate_pct') {
          const numericValue = value === null ? null : Number(value);
          if (existingColumns.has('interest_rate_pct')) {
            enqueueUpdate('interest_rate_pct', numericValue === null ? null : numericValue);
          }

          if (existingColumns.has('interest_rate')) {
            enqueueUpdate('interest_rate', numericValue === null ? null : numericValue / 100);
          }

          continue;
        }

        enqueueUpdate(targetColumn, value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    updates.forEach((update) => {
      if (update.useParam) {
        values.push(update.value);
        assignments.push(`${update.column} = $${values.length}`);
      } else {
        assignments.push(`${update.column} = NULL`);
      }
    });

    assignments.push('updated_at = NOW()');
    const setClause = assignments.join(', ');

    const candidateColumns = Array.from(
      new Set([
        ...identifierColumns,
        'facility_id',
      ])
    ).filter((column) => existingColumns.has(column));

    console.log('[capitalization/debt PATCH] candidate columns', candidateColumns);
    const updateAttempts: Array<{ column: string; rowCount: number }> = [];
    let updatedRow:
      | {
          facility_id: string | number | null;
          facility_name: string;
          loan_amount: unknown;
          commitment_amount: unknown;
          interest_rate_pct: unknown;
          interest_rate: unknown;
        }
      | null = null;

    for (const column of candidateColumns) {
    const paramsForAttempt = [...values, facilityIdText];
      const query = `
        UPDATE landscape.tbl_debt_facility
        SET ${setClause}
        WHERE ${column}::text = $${paramsForAttempt.length}
        RETURNING facility_id, facility_name, loan_amount, commitment_amount, interest_rate_pct, interest_rate
      `;

      console.log('[capitalization/debt PATCH] attempt', column, 'query', query.trim(), 'params', paramsForAttempt);
      const result = await sql.query(query, paramsForAttempt);
      const rowsArray = (result as any).rows ?? result;
      const rowCount = Array.isArray(rowsArray) ? rowsArray.length : 0;

      updateAttempts.push({ column, rowCount });
      console.log('[capitalization/debt PATCH] attempt result', { column, rowCount });

      if (rowCount > 0 && Array.isArray(rowsArray)) {
        updatedRow = rowsArray[0] as {
          facility_id: string | number | null;
          facility_name: string;
          loan_amount: unknown;
          commitment_amount: unknown;
          interest_rate_pct: unknown;
          interest_rate: unknown;
        };
        break;
      }
    }

    if (!updatedRow) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debt facility not found',
          debug: {
          facilityId: facilityIdText,
            attempts: updateAttempts,
            setClause,
          },
        },
        { status: 404 }
      );
    }

    const updated = updatedRow;
    const updatedFacilityId =
      updated.facility_id != null ? String(updated.facility_id) : null;
    const updatedLoanAmount = updated.loan_amount ?? updated.commitment_amount ?? null;
    let updatedInterestRatePct: number | null = null;

    if (updated.interest_rate_pct != null) {
      const rate = Number(updated.interest_rate_pct);
      updatedInterestRatePct = Number.isNaN(rate) ? null : rate <= 1 ? rate * 100 : rate;
    } else if (updated.interest_rate != null) {
      const rate = Number(updated.interest_rate);
      updatedInterestRatePct = Number.isNaN(rate) ? null : rate * 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        facility_id: updatedFacilityId,
        loan_amount: updatedLoanAmount,
        interest_rate_pct: updatedInterestRatePct,
      },
    });
  } catch (error) {
    console.error('Error updating debt facility:', error);
    const message = error instanceof Error ? error.message : 'Failed to update debt facility';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ facility_id: string }> }
) {
  try {
    const { facility_id } = await context.params;
    if (!/^[0-9]+$/.test(facility_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid facility_id parameter' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM landscape.tbl_debt_facility
      WHERE facility_id::text = ${facility_id}
      RETURNING facility_id, facility_name
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error deleting debt facility:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete debt facility';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
