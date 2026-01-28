/**
 * OpEx Add API
 *
 * POST /api/opex/add
 * Creates a new operating expense row
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface AddExpenseRequest {
  project_id: number;
  expense_category: string;
  expense_type?: string;
  parent_category: string;
  category_id?: number;
  unit_amount?: number | null;
  annual_amount?: number | null;
  amount_per_sf?: number | null;
  statement_discriminator?: string;
}

// Valid parent categories
const VALID_PARENT_CATEGORIES = [
  'taxes_insurance',
  'utilities',
  'repairs_maintenance',
  'payroll_personnel',
  'administrative',
  'management',
  'other',
  'unclassified'
];

export async function POST(request: NextRequest) {
  try {
    const body: AddExpenseRequest = await request.json();
    const {
      project_id,
      expense_category,
      expense_type,
      parent_category,
      category_id,
      unit_amount,
      annual_amount,
      amount_per_sf,
      statement_discriminator
    } = body;

    // Validate required fields
    if (!project_id || typeof project_id !== 'number') {
      return NextResponse.json(
        { error: 'project_id is required and must be a number' },
        { status: 400 }
      );
    }

    if (!expense_category || typeof expense_category !== 'string') {
      return NextResponse.json(
        { error: 'expense_category is required' },
        { status: 400 }
      );
    }

    if (!parent_category || !VALID_PARENT_CATEGORIES.includes(parent_category)) {
      return NextResponse.json(
        { error: `parent_category must be one of: ${VALID_PARENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify project exists
    const projectCheck = await sql`
      SELECT project_id FROM tbl_project WHERE project_id = ${project_id}
    `;
    if (projectCheck.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Insert the new expense row
    const insertResult = await sql`
      INSERT INTO tbl_operating_expenses (
        project_id,
        expense_category,
        expense_type,
        parent_category,
        category_id,
        unit_amount,
        annual_amount,
        amount_per_sf,
        statement_discriminator,
        source,
        created_at,
        updated_at
      ) VALUES (
        ${project_id},
        ${expense_category},
        ${expense_type || expense_category},
        ${parent_category},
        ${category_id || null},
        ${unit_amount || null},
        ${annual_amount || null},
        ${amount_per_sf || null},
        ${statement_discriminator || 'USER_INPUT'},
        'user',
        NOW(),
        NOW()
      )
      RETURNING
        opex_id,
        project_id,
        expense_category,
        expense_type,
        parent_category,
        category_id,
        unit_amount,
        annual_amount,
        amount_per_sf,
        statement_discriminator,
        source,
        created_at
    `;

    if (insertResult.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create expense' },
        { status: 500 }
      );
    }

    const newExpense = insertResult[0];

    // Also save to opex_label_mapping for future auto-categorization
    const normalizedLabel = expense_category.trim().toLowerCase();
    await sql`
      INSERT INTO opex_label_mapping (
        source_label,
        normalized_label,
        parent_category,
        target_field,
        times_used
      ) VALUES (
        ${expense_category},
        ${normalizedLabel},
        ${parent_category},
        NULL,
        1
      )
      ON CONFLICT (source_label)
      DO UPDATE SET
        parent_category = ${parent_category},
        times_used = opex_label_mapping.times_used + 1
    `;

    return NextResponse.json({
      success: true,
      message: `Created expense "${expense_category}"`,
      expense: newExpense
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating expense:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create expense', details: errorMessage },
      { status: 500 }
    );
  }
}
