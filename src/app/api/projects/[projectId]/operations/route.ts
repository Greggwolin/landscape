/**
 * Operations API - Unified P&L View
 *
 * GET /api/projects/:projectId/operations
 * Returns unified operations data with all four sections:
 * - Rental Income
 * - Vacancy & Deductions
 * - Other Income
 * - Operating Expenses
 *
 * Each section includes user inputs, evidence (by scenario), and totals.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    // 1. Get project details
    // Note: value_add_enabled column may not exist until migration 043 is run
    const projectResult = await sql`
      SELECT
        project_id,
        project_name,
        project_type_code
      FROM tbl_project
      WHERE project_id = ${projectIdNum}
    `;

    // Check if value_add_enabled column exists and get its value
    let valueAddEnabled = false;
    try {
      const valueAddResult = await sql`
        SELECT value_add_enabled FROM tbl_project WHERE project_id = ${projectIdNum}
      `;
      valueAddEnabled = valueAddResult[0]?.value_add_enabled || false;
    } catch {
      // Column doesn't exist yet, use default
    }

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectResult[0];

    // 2. Get unit count and total SF from multifamily unit types
    const unitSummary = await sql`
      SELECT
        COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0) as unit_count,
        COALESCE(SUM(COALESCE(unit_count, total_units, 0) * COALESCE(avg_square_feet, 0)), 0) as total_sf
      FROM tbl_multifamily_unit_type
      WHERE project_id = ${projectIdNum}
    `;

    const unitCount = parseInt(unitSummary[0]?.unit_count || '0', 10);
    const totalSF = parseFloat(unitSummary[0]?.total_sf || '0');

    // 3. Get available scenarios from operating expenses
    const scenarioResult = await sql`
      SELECT DISTINCT statement_discriminator
      FROM tbl_operating_expenses
      WHERE project_id = ${projectIdNum}
        AND statement_discriminator IS NOT NULL
    `;

    // Sort scenarios by priority
    const scenarioPriority: Record<string, number> = {
      'T3_ANNUALIZED': 1,
      'T12': 2,
      'T-12': 3,
      'CURRENT_PRO_FORMA': 4,
      'BROKER_PRO_FORMA': 5
    };
    const availableScenarios = scenarioResult
      .map(r => r.statement_discriminator)
      .sort((a, b) => (scenarioPriority[a] || 10) - (scenarioPriority[b] || 10));
    const preferredScenario = availableScenarios[0] || 'T3_ANNUALIZED';

    // 4. Get rental income from multifamily unit types
    const rentalIncomeRows = await sql`
      SELECT
        COALESCE(unit_type_code, unit_type_name, 'Unit') as line_item_key,
        COALESCE(unit_type_name, unit_type_code, 'Unit') as label,
        COALESCE(unit_count, total_units, 0) as unit_count,
        COALESCE(market_rent, current_market_rent, 0) as rate,
        COALESCE(avg_square_feet, 0) as avg_unit_sf,
        (COALESCE(unit_count, total_units, 0) * COALESCE(market_rent, current_market_rent, 0) * 12) as annual_total
      FROM tbl_multifamily_unit_type
      WHERE project_id = ${projectIdNum}
      ORDER BY unit_type_code, unit_type_name
    `;

    const rentalIncome = {
      section_type: 'flat' as const,
      rows: rentalIncomeRows.map(row => ({
        line_item_key: `rental_${row.line_item_key}`,
        label: row.label || 'Unit',
        level: 0,
        is_calculated: false,
        as_is: {
          count: parseInt(row.unit_count, 10),
          rate: parseFloat(row.rate) || 0,
          per_sf: parseFloat(row.avg_unit_sf) > 0
            ? (parseFloat(row.rate) || 0) / parseFloat(row.avg_unit_sf)
            : null,
          total: parseFloat(row.annual_total) || 0
        },
        post_reno: {
          count: parseInt(row.unit_count, 10),
          rate: parseFloat(row.rate) || 0,
          total: parseFloat(row.annual_total) || 0
        },
        evidence: {}
      })),
      section_total: {
        as_is: rentalIncomeRows.reduce((sum, r) => sum + (parseFloat(r.annual_total) || 0), 0),
        post_reno: rentalIncomeRows.reduce((sum, r) => sum + (parseFloat(r.annual_total) || 0), 0)
      }
    };

    // 5. Get vacancy deductions (default values if not configured)
    const vacancyDeductions = {
      section_type: 'flat' as const,
      rows: [
        {
          line_item_key: 'physical_vacancy',
          label: 'Physical Vacancy',
          level: 0,
          is_calculated: false,
          is_percentage: true,
          as_is: {
            rate: 0.05, // 5% default
            total: -(rentalIncome.section_total.as_is * 0.05)
          },
          post_reno: {
            rate: 0.03, // 3% post-reno
            total: -(rentalIncome.section_total.post_reno * 0.03)
          },
          evidence: {}
        },
        {
          line_item_key: 'credit_loss',
          label: 'Credit Loss',
          level: 0,
          is_calculated: false,
          is_percentage: true,
          as_is: {
            rate: 0.02, // 2% default
            total: -(rentalIncome.section_total.as_is * 0.02)
          },
          post_reno: {
            rate: 0.01,
            total: -(rentalIncome.section_total.post_reno * 0.01)
          },
          evidence: {}
        },
        {
          line_item_key: 'concessions',
          label: 'Concessions',
          level: 0,
          is_calculated: false,
          is_percentage: true,
          as_is: {
            rate: 0.01,
            total: -(rentalIncome.section_total.as_is * 0.01)
          },
          post_reno: {
            rate: 0.005,
            total: -(rentalIncome.section_total.post_reno * 0.005)
          },
          evidence: {}
        }
      ],
      section_total: {
        as_is: -(rentalIncome.section_total.as_is * 0.08), // 8% total deductions
        post_reno: -(rentalIncome.section_total.post_reno * 0.045) // 4.5% post-reno
      }
    };

    // 6. Get other income (placeholder)
    const otherIncome = {
      section_type: 'hierarchical' as const,
      rows: [] as any[],
      section_total: { as_is: 0, post_reno: 0 }
    };

    // 7. Get operating expenses with CoA hierarchy
    const opexResult = await sql`
      SELECT
        c.category_id,
        c.account_number,
        c.category_name,
        c.parent_id,
        c.is_calculated,
        c.sort_order,
        oe.opex_id,
        oe.annual_amount,
        oe.unit_amount,
        oe.amount_per_sf,
        oe.escalation_rate,
        oe.statement_discriminator
      FROM core_unit_cost_category c
      LEFT JOIN tbl_operating_expenses oe
        ON c.category_id = oe.category_id
        AND oe.project_id = ${projectIdNum}
      WHERE c.account_number LIKE '5%'
        AND c.is_active = true
      ORDER BY c.account_number
    `;

    // Build hierarchical structure
    // Step 1: Create all category objects
    const categoryMap = new Map<number, any>();

    opexResult.forEach(row => {
      // Skip if we've already seen this category (can happen with LEFT JOIN)
      if (categoryMap.has(row.category_id)) {
        // Just merge evidence data
        const existing = categoryMap.get(row.category_id);
        if (row.statement_discriminator && row.annual_amount) {
          existing.evidence[row.statement_discriminator] = {
            per_unit: row.unit_amount ? parseFloat(row.unit_amount) : null,
            total: parseFloat(row.annual_amount)
          };
        }
        return;
      }

      const category = {
        line_item_key: `opex_${row.category_id}`,
        label: row.category_name,
        category_id: row.category_id,
        parent_id: row.parent_id,
        level: 0,
        is_calculated: row.is_calculated,
        as_is: {
          rate: row.unit_amount ? parseFloat(row.unit_amount) : null,
          total: row.annual_amount ? parseFloat(row.annual_amount) : 0
        },
        post_reno: {
          rate: row.unit_amount ? parseFloat(row.unit_amount) : null,
          total: row.annual_amount ? parseFloat(row.annual_amount) : 0
        },
        evidence: row.statement_discriminator ? {
          [row.statement_discriminator]: {
            per_unit: row.unit_amount ? parseFloat(row.unit_amount) : null,
            total: row.annual_amount ? parseFloat(row.annual_amount) : null
          }
        } : {},
        children: [],
        is_expanded: true
      };

      categoryMap.set(row.category_id, category);
    });

    // Step 2: Build parent-child relationships and calculate levels
    const rootCategories: any[] = [];

    categoryMap.forEach(category => {
      if (!category.parent_id) {
        category.level = 0;
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(category);
        }
      }
    });

    // Step 3: Calculate levels recursively
    const setLevels = (categories: any[], level: number) => {
      categories.forEach(cat => {
        cat.level = level;
        if (cat.children.length > 0) {
          setLevels(cat.children, level + 1);
        }
      });
    };
    setLevels(rootCategories, 0);

    // Step 4: Flatten hierarchy to 2 levels for display (parent + children)
    // For deep hierarchies, we show only root parents and their leaf children
    const flattenToTwoLevels = (categories: any[]): any[] => {
      const result: any[] = [];

      const collectLeaves = (cat: any): any[] => {
        if (cat.children.length === 0) {
          return [cat];
        }
        return cat.children.flatMap(collectLeaves);
      };

      categories.forEach(rootCat => {
        const leaves = collectLeaves(rootCat).map(leaf => ({
          ...leaf,
          level: 1
        }));

        // Calculate parent totals from children
        const parentAsIsTotal = leaves.reduce((sum, child) => sum + (child.as_is?.total || 0), 0);
        const parentPostRenoTotal = leaves.reduce((sum, child) => sum + (child.post_reno?.total || 0), 0);

        // Add root parent with calculated totals
        const flatParent = {
          ...rootCat,
          level: 0,
          as_is: {
            ...rootCat.as_is,
            total: parentAsIsTotal,
            // Calculate per-unit rate from total
            rate: unitCount > 0 ? parentAsIsTotal / unitCount / 12 : null
          },
          post_reno: {
            ...rootCat.post_reno,
            total: parentPostRenoTotal,
            rate: unitCount > 0 ? parentPostRenoTotal / unitCount / 12 : null
          },
          children: leaves
        };
        result.push(flatParent);
      });

      return result;
    };

    const flattenedCategories = flattenToTwoLevels(rootCategories);

    // Step 5: Filter to only show categories with data or children with data
    const filterEmptyCategories = (categories: any[]): any[] => {
      return categories.filter(cat => {
        if (cat.children && cat.children.length > 0) {
          cat.children = filterEmptyCategories(cat.children);
          return cat.children.length > 0;
        }
        return cat.as_is.total > 0 || Object.keys(cat.evidence).length > 0;
      });
    };

    const filteredCategories = filterEmptyCategories(flattenedCategories);

    // Calculate section totals from the parent category totals (which sum their leaf children)
    const sectionAsIsTotal = filteredCategories.reduce((sum, cat) => sum + (cat.as_is?.total || 0), 0);
    const sectionPostRenoTotal = filteredCategories.reduce((sum, cat) => sum + (cat.post_reno?.total || 0), 0);

    const operatingExpenses = {
      section_type: 'hierarchical' as const,
      rows: filteredCategories,
      section_total: {
        as_is: sectionAsIsTotal,
        post_reno: sectionPostRenoTotal
      }
    };

    // 8. Calculate totals
    const grossPotentialRent = rentalIncome.section_total.as_is;
    const netRentalIncome = grossPotentialRent + vacancyDeductions.section_total.as_is;
    const totalOtherIncome = otherIncome.section_total.as_is;
    const effectiveGrossIncome = netRentalIncome + totalOtherIncome;
    const totalOperatingExpenses = operatingExpenses.section_total.as_is;
    const asIsNOI = effectiveGrossIncome - totalOperatingExpenses;

    const postRenoGPR = rentalIncome.section_total.post_reno;
    const postRenoNRI = postRenoGPR + vacancyDeductions.section_total.post_reno;
    const postRenoEGI = postRenoNRI + otherIncome.section_total.post_reno;
    const postRenoNOI = postRenoEGI - operatingExpenses.section_total.post_reno;

    const noiUplift = postRenoNOI - asIsNOI;
    const noiUpliftPercent = asIsNOI !== 0 ? noiUplift / asIsNOI : 0;

    return NextResponse.json({
      project_id: projectIdNum,
      project_type_code: project.project_type_code,
      property_summary: {
        unit_count: unitCount,
        total_sf: totalSF,
        avg_unit_sf: unitCount > 0 ? totalSF / unitCount : 0
      },
      value_add_enabled: valueAddEnabled,
      rental_income: rentalIncome,
      vacancy_deductions: vacancyDeductions,
      other_income: otherIncome,
      operating_expenses: operatingExpenses,
      totals: {
        gross_potential_rent: grossPotentialRent,
        net_rental_income: netRentalIncome,
        total_other_income: totalOtherIncome,
        effective_gross_income: effectiveGrossIncome,
        total_operating_expenses: totalOperatingExpenses,
        as_is_noi: asIsNOI,
        post_reno_noi: postRenoNOI,
        noi_uplift: noiUplift,
        noi_uplift_percent: noiUpliftPercent
      },
      available_scenarios: availableScenarios,
      preferred_scenario: preferredScenario
    });
  } catch (error) {
    console.error('Error fetching operations data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch operations data', details: errorMessage },
      { status: 500 }
    );
  }
}
