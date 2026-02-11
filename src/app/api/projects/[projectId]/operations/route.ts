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
    // 1. Get project details including analysis_type
    const projectResult = await sql`
      SELECT
        project_id,
        project_name,
        project_type_code,
        analysis_type,
        value_add_enabled,
        active_opex_discriminator
      FROM tbl_project
      WHERE project_id = ${projectIdNum}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectResult[0];
    const analysisType = project.analysis_type || 'INVESTMENT';
    const valueAddEnabled = project.value_add_enabled || false;
    const activeOpexDiscriminator = project.active_opex_discriminator || null;

    // 2. Fetch vacancy and expense assumptions from tbl_project_assumption
    const assumptionsResult = await sql`
      SELECT assumption_key, assumption_value
      FROM tbl_project_assumption
      WHERE project_id = ${projectIdNum}
        AND assumption_key IN (
          'physical_vacancy_pct',
          'bad_debt_pct',
          'concessions_pct',
          'management_fee_pct',
          'replacement_reserve_pct'
        )
    `;

    // Build assumptions object with defaults
    const assumptions: Record<string, number> = {
      physical_vacancy_pct: 0.05,    // Default 5%
      bad_debt_pct: 0.02,            // Default 2%
      concessions_pct: 0.01,         // Default 1%
      management_fee_pct: 0.03,      // Default 3%
      replacement_reserve_pct: 300   // Default $300/unit
    };

    assumptionsResult.forEach(row => {
      const value = parseFloat(row.assumption_value);
      if (!isNaN(value)) {
        assumptions[row.assumption_key] = value;
      }
    });

    // 3. Get unit count and total SF
    // Priority 1: Get from tbl_project (authoritative)
    const projectSummary = await sql`
      SELECT total_units, gross_sf
      FROM tbl_project
      WHERE project_id = ${projectIdNum}
    `;

    let unitCount = parseInt(projectSummary[0]?.total_units || '0', 10);
    let totalSF = parseFloat(projectSummary[0]?.gross_sf || '0');

    // Priority 2: Count from tbl_multifamily_unit if project doesn't have it
    if (!unitCount) {
      const unitCountResult = await sql`
        SELECT COUNT(*)::int as unit_count, COALESCE(SUM(square_feet), 0)::numeric as total_sf
        FROM tbl_multifamily_unit
        WHERE project_id = ${projectIdNum}
      `;
      unitCount = parseInt(unitCountResult[0]?.unit_count || '0', 10);
      if (!totalSF) {
        totalSF = parseFloat(unitCountResult[0]?.total_sf || '0');
      }
    }

    // Priority 3: Fall back to unit_type aggregates (may have duplicates, avoid if possible)
    if (!unitCount) {
      const unitSummary = await sql`
        SELECT
          COALESCE(SUM(COALESCE(unit_count, total_units, 0)), 0) as unit_count,
          COALESCE(SUM(COALESCE(unit_count, total_units, 0) * COALESCE(avg_square_feet, 0)), 0) as total_sf
        FROM tbl_multifamily_unit_type
        WHERE project_id = ${projectIdNum}
      `;
      unitCount = parseInt(unitSummary[0]?.unit_count || '0', 10);
      if (!totalSF) {
        totalSF = parseFloat(unitSummary[0]?.total_sf || '0');
      }
    }

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
    const preferredScenario = (activeOpexDiscriminator && availableScenarios.includes(activeOpexDiscriminator))
      ? activeOpexDiscriminator
      : (availableScenarios[0] || 'T3_ANNUALIZED');

    // 4. Get rental income - try detailed rent roll first, fall back to floor plan matrix
    // Priority 1: Aggregate from tbl_multifamily_unit (individual units with current_rent, market_rent)
    const detailedRentRollQuery = await sql`
      SELECT
        COALESCE(u.unit_type, 'Unknown') as unit_type,
        COUNT(*) as unit_count,
        COALESCE(AVG(u.square_feet), 0) as avg_unit_sf,
        COALESCE(AVG(u.current_rent), 0) as avg_current_rent,
        COALESCE(AVG(u.market_rent), 0) as avg_market_rent,
        SUM(COALESCE(u.current_rent, 0)) * 12 as current_annual_total,
        SUM(COALESCE(u.market_rent, 0)) * 12 as market_annual_total
      FROM tbl_multifamily_unit u
      WHERE u.project_id = ${projectIdNum}
      GROUP BY u.unit_type
      ORDER BY u.unit_type
    `;

    const hasDetailedRentRoll = detailedRentRollQuery.length > 0;

    // Calculate physical vacancy from occupancy_status (if detailed rent roll exists)
    let calculatedPhysicalVacancy: number | null = null;
    if (hasDetailedRentRoll) {
      const vacancyCalcResult = await sql`
        SELECT
          COUNT(*) FILTER (WHERE occupancy_status != 'Occupied' OR occupancy_status IS NULL) as vacant_count,
          COUNT(*) as total_count
        FROM tbl_multifamily_unit
        WHERE project_id = ${projectIdNum}
      `;
      const vacantCount = parseInt(vacancyCalcResult[0]?.vacant_count || '0', 10);
      const totalCount = parseInt(vacancyCalcResult[0]?.total_count || '0', 10);
      calculatedPhysicalVacancy = totalCount > 0 ? vacantCount / totalCount : 0;
    }

    // Priority 2: Fall back to tbl_multifamily_unit_type (floor plan matrix)
    const fallbackRentRollQuery = await sql`
      SELECT
        COALESCE(unit_type_code, unit_type_name, 'Unit') as unit_type,
        COALESCE(unit_count, total_units, 0) as unit_count,
        COALESCE(avg_square_feet, 0) as avg_unit_sf,
        COALESCE(market_rent, current_market_rent, 0) as market_rent
      FROM tbl_multifamily_unit_type
      WHERE project_id = ${projectIdNum}
      ORDER BY unit_type_code, unit_type_name
    `;

    // Use detailed rent roll if available, otherwise fall back to floor plan matrix
    const rentalIncomeRows = hasDetailedRentRoll
      ? detailedRentRollQuery.map(row => ({
          line_item_key: `rental_${row.unit_type}`,
          label: row.unit_type || 'Unit',
          unit_count: parseInt(row.unit_count, 10),
          avg_unit_sf: parseFloat(row.avg_unit_sf) || 0,
          current_rent: parseFloat(row.avg_current_rent) || 0,
          market_rent: parseFloat(row.avg_market_rent) || 0,
          current_annual_total: parseFloat(row.current_annual_total) || 0,
          market_annual_total: parseFloat(row.market_annual_total) || 0
        }))
      : fallbackRentRollQuery.map(row => ({
          line_item_key: `rental_${row.unit_type}`,
          label: row.unit_type || 'Unit',
          unit_count: parseInt(row.unit_count, 10),
          avg_unit_sf: parseFloat(row.avg_unit_sf) || 0,
          // For floor plan matrix, use market_rent for both current and market
          current_rent: parseFloat(row.market_rent) || 0,
          market_rent: parseFloat(row.market_rent) || 0,
          current_annual_total: parseInt(row.unit_count, 10) * (parseFloat(row.market_rent) || 0) * 12,
          market_annual_total: parseInt(row.unit_count, 10) * (parseFloat(row.market_rent) || 0) * 12
        }));

    // Calculate totals for both current and market rent
    const currentGPRTotal = rentalIncomeRows.reduce((sum, r) => sum + r.current_annual_total, 0);
    const marketGPRTotal = rentalIncomeRows.reduce((sum, r) => sum + r.market_annual_total, 0);

    const rentalIncome = {
      section_type: 'flat' as const,
      is_readonly: true, // Rental income is always read-only (from rent roll)
      has_detailed_rent_roll: hasDetailedRentRoll,
      rows: rentalIncomeRows.map(row => ({
        line_item_key: row.line_item_key,
        label: row.label,
        level: 0,
        is_calculated: false,
        is_readonly: true, // Individual rows are also read-only
        as_is: {
          count: row.unit_count,
          rate: row.current_rent, // Current rent (in-place)
          market_rate: row.market_rent, // Market rent (for comparison)
          per_sf: row.avg_unit_sf > 100
            ? row.current_rent / row.avg_unit_sf
            : null,
          market_per_sf: row.avg_unit_sf > 100
            ? row.market_rent / row.avg_unit_sf
            : null,
          total: row.current_annual_total, // Current total
          market_total: row.market_annual_total // Market total
        },
        post_reno: {
          count: row.unit_count,
          rate: row.market_rent, // Post-reno uses market rent
          total: row.market_annual_total
        },
        evidence: {}
      })),
      section_total: {
        as_is: currentGPRTotal, // Current rent total
        as_is_market: marketGPRTotal, // Market rent total
        post_reno: marketGPRTotal // Post-reno uses market total
      }
    };

    // 5. Get vacancy deductions from assumptions
    // Physical vacancy is calculated from rent roll if detailed data exists, otherwise from assumptions
    const physicalVacancyRate = calculatedPhysicalVacancy !== null
      ? calculatedPhysicalVacancy
      : assumptions.physical_vacancy_pct;

    const creditLossRate = assumptions.bad_debt_pct;
    const concessionsRate = assumptions.concessions_pct;

    const vacancyDeductions = {
      section_type: 'flat' as const,
      has_detailed_rent_roll: hasDetailedRentRoll,
      calculated_physical_vacancy: calculatedPhysicalVacancy,
      rows: [
        {
          line_item_key: 'physical_vacancy',
          label: 'Physical Vacancy',
          level: 0,
          is_calculated: hasDetailedRentRoll, // Calculated if rent roll exists
          is_readonly: hasDetailedRentRoll, // Read-only if calculated from rent roll
          is_percentage: true,
          as_is: {
            rate: physicalVacancyRate,
            total: -(currentGPRTotal * physicalVacancyRate),
            market_total: -(marketGPRTotal * physicalVacancyRate)
          },
          post_reno: {
            rate: 0.03, // 3% post-reno (stabilized)
            total: -(marketGPRTotal * 0.03)
          },
          evidence: {}
        },
        {
          line_item_key: 'credit_loss',
          label: 'Credit Loss',
          level: 0,
          is_calculated: false, // Always user input (assumption)
          is_readonly: false,
          is_percentage: true,
          as_is: {
            rate: creditLossRate,
            total: -(currentGPRTotal * creditLossRate),
            market_total: -(marketGPRTotal * creditLossRate)
          },
          post_reno: {
            rate: 0.01,
            total: -(marketGPRTotal * 0.01)
          },
          evidence: {}
        },
        {
          line_item_key: 'concessions',
          label: 'Concessions',
          level: 0,
          is_calculated: false, // Always user input (assumption)
          is_readonly: false,
          is_percentage: true,
          as_is: {
            rate: concessionsRate,
            total: -(currentGPRTotal * concessionsRate),
            market_total: -(marketGPRTotal * concessionsRate)
          },
          post_reno: {
            rate: 0.005,
            total: -(marketGPRTotal * 0.005)
          },
          evidence: {}
        }
      ],
      section_total: {
        as_is: -(currentGPRTotal * (physicalVacancyRate + creditLossRate + concessionsRate)),
        as_is_market: -(marketGPRTotal * (physicalVacancyRate + creditLossRate + concessionsRate)),
        post_reno: -(marketGPRTotal * 0.045) // 4.5% post-reno (3% vacancy + 1% credit + 0.5% concessions)
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

    const parseNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return Number.isFinite(num) ? num : null;
    };

    const getAnnualTotal = (row: typeof opexResult[number]): number => {
      const annualAmount = parseNumber(row.annual_amount);
      if (annualAmount && annualAmount !== 0) return annualAmount;

      const unitAmount = parseNumber(row.unit_amount);
      if (unitAmount && unitCount > 0) {
        return unitAmount * unitCount;
      }

      const perSfAmount = parseNumber(row.amount_per_sf);
      if (perSfAmount && totalSF > 0) {
        return perSfAmount * totalSF;
      }

      return 0;
    };

    opexResult.forEach(row => {
      // Skip if we've already seen this category (can happen with LEFT JOIN)
      if (categoryMap.has(row.category_id)) {
        // Just merge evidence data
        const existing = categoryMap.get(row.category_id);
        const annualTotal = getAnnualTotal(row);
        const unitAmount = parseNumber(row.unit_amount);
        const perSfAmount = parseNumber(row.amount_per_sf);

        if (row.statement_discriminator && (annualTotal || unitAmount || perSfAmount)) {
          existing.evidence[row.statement_discriminator] = {
            per_unit: unitAmount,
            per_sf: perSfAmount,
            total: annualTotal
          };
        }
        if (existing.as_is.total === 0 && annualTotal > 0) {
          existing.as_is.total = annualTotal;
          existing.post_reno.total = annualTotal;
          existing.as_is.rate = unitAmount;
          existing.post_reno.rate = unitAmount;
        }
        return;
      }

      const unitAmount = parseNumber(row.unit_amount);
      const perSfAmount = parseNumber(row.amount_per_sf);
      const annualTotal = getAnnualTotal(row);

      const category = {
        line_item_key: `opex_${row.category_id}`,
        label: row.category_name,
        category_id: row.category_id,
        parent_id: row.parent_id,
        level: 0,
        is_calculated: row.is_calculated,
        as_is: {
          rate: unitAmount,
          total: annualTotal
        },
        post_reno: {
          rate: unitAmount,
          total: annualTotal
        },
        evidence: row.statement_discriminator ? {
          [row.statement_discriminator]: {
            per_unit: unitAmount,
            per_sf: perSfAmount,
            total: annualTotal || null
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
        return cat.as_is.total > 0 || cat.as_is.rate || Object.keys(cat.evidence).length > 0;
      });
    };

    const filteredCategories = filterEmptyCategories(flattenedCategories);

    // Parent category labels for UI display
    const parentCategoryLabels: Record<string, string> = {
      'taxes_insurance': 'Taxes & Insurance',
      'utilities': 'Utilities',
      'repairs_maintenance': 'Repairs & Maintenance',
      'payroll_personnel': 'Payroll & Personnel',
      'administrative': 'Administrative',
      'management': 'Management',
      'other': 'Other Expenses',
      'unclassified': 'Unclassified'
    };

    // Convert snake_case expense labels to Title Case for display
    const formatExpenseLabel = (label: string): string => {
      if (!label) return 'Operating Expense';
      return label
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    const mapLegacyOpexRows = async () => {
      // Filter out management-related expenses since we calculate Management Fee separately
      // This prevents double-counting extracted management expenses
      const legacyRows = await sql`
        SELECT
          opex_id,
          expense_category,
          expense_type,
          annual_amount,
          unit_amount,
          amount_per_sf,
          escalation_rate,
          statement_discriminator,
          updated_at,
          COALESCE(parent_category, 'unclassified') as parent_category
        FROM tbl_operating_expenses
        WHERE project_id = ${projectIdNum}
          AND LOWER(COALESCE(expense_type, '')) NOT IN ('management', 'management fee', 'property management')
          AND LOWER(COALESCE(parent_category, '')) != 'management'
        ORDER BY parent_category, expense_category, updated_at DESC
      `;

      if (legacyRows.length === 0) {
        return [];
      }

      const normalizeKey = (value: string | null | undefined): string => {
        return (value || '').trim().toLowerCase();
      };

      const deriveParentCategory = (expenseType: string | null | undefined, label: string | null | undefined): string => {
        const type = normalizeKey(expenseType);
        const text = normalizeKey(label);

        if (type.includes('tax') || text.includes('tax') || text.includes('insurance')) {
          return 'taxes_insurance';
        }
        if (type.includes('utilit') || text.match(/\b(water|gas|electric|trash|sewer)\b/)) {
          return 'utilities';
        }
        if (type.includes('repair') || text.match(/\b(maintenance|turnover|landscap|pest|pool|contract)\b/)) {
          return 'repairs_maintenance';
        }
        if (type.includes('management') || text.match(/\b(management|manager)\b/)) {
          if (text.match(/\b(payroll|salary|wage|benefit)\b/)) {
            return 'payroll_personnel';
          }
          if (text.match(/\b(admin|office|telephone|legal|accounting|professional)\b/)) {
            return 'administrative';
          }
          return 'management';
        }
        return 'other';
      };

      const getAnnualTotal = (row: typeof legacyRows[number]): number => {
        const annualAmount = parseNumber(row.annual_amount);
        if (annualAmount && annualAmount !== 0) return annualAmount;

        const unitAmount = parseNumber(row.unit_amount);
        if (unitAmount && unitCount > 0) {
          return unitAmount * unitCount;
        }

        const perSfAmount = parseNumber(row.amount_per_sf);
        if (perSfAmount && totalSF > 0) {
          return perSfAmount * totalSF;
        }

        return 0;
      };

      type LegacyRow = typeof legacyRows[number];
      type ScenarioRow = { row: LegacyRow; updatedAt: number };
      type LegacyGroup = {
        key: string;
        label: string;
        parentCategory: string;
        rowsByScenario: Map<string, ScenarioRow>;
      };

      const groups = new Map<string, LegacyGroup>();

      legacyRows.forEach(row => {
        const rawParent = normalizeKey(row.parent_category);
        const derivedParent = (rawParent && rawParent !== 'unclassified')
          ? rawParent
          : deriveParentCategory(row.expense_type, row.expense_category);
        const parentCategory = derivedParent || 'unclassified';
        const label = formatExpenseLabel(row.expense_category || row.expense_type || '');
        const key = `${normalizeKey(row.expense_category)}|${normalizeKey(row.expense_type)}|${parentCategory}`;
        const scenario = row.statement_discriminator || 'default';
        const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;

        const group = groups.get(key) || {
          key,
          label,
          parentCategory,
          rowsByScenario: new Map()
        };

        const existingScenario = group.rowsByScenario.get(scenario);
        if (!existingScenario || updatedAt >= existingScenario.updatedAt) {
          group.rowsByScenario.set(scenario, { row, updatedAt });
        }

        groups.set(key, group);
      });

      const scenarioFallbackOrder = [
        preferredScenario,
        ...availableScenarios,
        'default'
      ];

      // Group expenses by parent_category
      const groupedByParent: Map<string, any[]> = new Map();

      groups.forEach(group => {
        const parentCat = group.parentCategory || 'unclassified';
        if (!groupedByParent.has(parentCat)) {
          groupedByParent.set(parentCat, []);
        }

        let selectedScenario: ScenarioRow | undefined;
        for (const scenario of scenarioFallbackOrder) {
          const candidate = group.rowsByScenario.get(scenario);
          if (candidate) {
            selectedScenario = candidate;
            break;
          }
        }
        if (!selectedScenario) {
          const first = group.rowsByScenario.values().next();
          selectedScenario = first.done ? undefined : first.value;
        }
        if (!selectedScenario) return;

        const selectedRow = selectedScenario.row;
        const annualAmount = getAnnualTotal(selectedRow) || 0;
        const perSfAmount = parseNumber(selectedRow.amount_per_sf);
        const unitAmount = parseNumber(selectedRow.unit_amount);
        const perUnitAmount = unitAmount ?? (unitCount > 0 ? annualAmount / unitCount : null);

        const evidence: Record<string, any> = {};
        group.rowsByScenario.forEach((scenarioRow, scenario) => {
          const scenarioTotal = getAnnualTotal(scenarioRow.row) || 0;
          const scenarioUnitAmount = parseNumber(scenarioRow.row.unit_amount);
          const scenarioPerUnit = scenarioUnitAmount ?? (unitCount > 0 ? scenarioTotal / unitCount : null);
          const scenarioPerSf = parseNumber(scenarioRow.row.amount_per_sf);

          evidence[scenario] = {
            per_unit: scenarioPerUnit,
            per_sf: scenarioPerSf,
            total: scenarioTotal || null
          };
        });

        groupedByParent.get(parentCat)!.push({
          opex_id: parseInt(selectedRow.opex_id, 10),
          line_item_key: `legacy_opex_${selectedRow.opex_id}`,
          label: group.label,
          level: 1,
          is_calculated: false,
          parent_category: parentCat,
          is_draggable: true, // All expense items are draggable between categories
          as_is: {
            rate: perUnitAmount,
            total: annualAmount
          },
          post_reno: {
            rate: perUnitAmount,
            total: annualAmount
          },
          evidence,
          children: []
        });
      });

      // Build hierarchical structure with parent categories
      const result: any[] = [];

      // Define sort order for parent categories
      const categoryOrder = [
        'taxes_insurance',
        'utilities',
        'repairs_maintenance',
        'payroll_personnel',
        'administrative',
        'management',
        'other',
        'unclassified'
      ];

      categoryOrder.forEach(parentCat => {
        const children = groupedByParent.get(parentCat) || [];
        if (children.length > 0) {
          const parentAsIsTotal = children.reduce((sum, child) => sum + (child.as_is?.total || 0), 0);
          const parentPostRenoTotal = children.reduce((sum, child) => sum + (child.post_reno?.total || 0), 0);

          result.push({
            line_item_key: `opex_parent_${parentCat}`,
            label: parentCategoryLabels[parentCat] || parentCat,
            parent_category: parentCat,
            level: 0,
            is_calculated: true,
            is_expanded: true,
            // Unclassified section is highlighted
            is_unclassified_section: parentCat === 'unclassified',
            as_is: {
              rate: unitCount > 0 ? parentAsIsTotal / unitCount / 12 : null,
              total: parentAsIsTotal
            },
            post_reno: {
              rate: unitCount > 0 ? parentPostRenoTotal / unitCount / 12 : null,
              total: parentPostRenoTotal
            },
            evidence: {},
            children: children
          });
        }
      });

      return result;
    };

    // Always use legacy opex rows when they exist - they have parent_category grouping
    // for the drag-and-drop categorization UI
    const legacyRows = await mapLegacyOpexRows();

    // Calculate EGI first (needed for Management Fee calculation)
    const grossPotentialRent = rentalIncome.section_total.as_is;
    const grossPotentialRentMarket = rentalIncome.section_total.as_is_market || rentalIncome.section_total.as_is;
    const netRentalIncome = grossPotentialRent + vacancyDeductions.section_total.as_is;
    const netRentalIncomeMarket = grossPotentialRentMarket + (vacancyDeductions.section_total.as_is_market || vacancyDeductions.section_total.as_is);
    const totalOtherIncome = otherIncome.section_total.as_is;
    const effectiveGrossIncome = netRentalIncome + totalOtherIncome;
    const effectiveGrossIncomeMarket = netRentalIncomeMarket + totalOtherIncome;

    const postRenoGPR = rentalIncome.section_total.post_reno;
    const postRenoNRI = postRenoGPR + vacancyDeductions.section_total.post_reno;
    const postRenoEGI = postRenoNRI + otherIncome.section_total.post_reno;

    // Calculate Management Fee (EGI × management_fee_pct)
    const managementFeePct = assumptions.management_fee_pct;
    const managementFeeAsIs = effectiveGrossIncome * managementFeePct;
    const managementFeeMarket = effectiveGrossIncomeMarket * managementFeePct;
    const managementFeePostReno = postRenoEGI * managementFeePct;

    // Calculate Replacement Reserves (reserves_per_unit × unit_count)
    const reservesPerUnit = assumptions.replacement_reserve_pct;
    const replacementReserves = reservesPerUnit * unitCount;

    // Create calculated expense rows for Management Fee and Replacement Reserves
    // NOTE: is_calculated must be false so the UI renders these as flat child rows,
    // not as collapsible parent/accordion rows. is_readonly prevents editing.
    const calculatedExpenseRows = [
      {
        line_item_key: 'calculated_management_fee',
        label: `Management Fee (${(managementFeePct * 100).toFixed(1)}%)`,
        level: 1,
        is_calculated: false,
        is_readonly: true,
        is_percentage: true,
        parent_category: 'management_reserves',
        calculation_base: 'egi',
        as_is: {
          rate: managementFeePct,
          total: managementFeeAsIs
        },
        post_reno: {
          rate: managementFeePct,
          total: managementFeePostReno
        },
        evidence: {},
        children: []
      },
      {
        line_item_key: 'calculated_replacement_reserves',
        label: `Replacement Reserves ($${reservesPerUnit.toFixed(0)}/unit)`,
        level: 1,
        is_calculated: false,
        is_readonly: true,
        parent_category: 'management_reserves',
        as_is: {
          rate: reservesPerUnit,
          total: replacementReserves
        },
        post_reno: {
          rate: reservesPerUnit,
          total: replacementReserves
        },
        evidence: {},
        children: []
      }
    ];

    if (legacyRows.length > 0) {
      // Add calculated expenses (Management Fee, Replacement Reserves) as a new category
      const legacyTotal = legacyRows.reduce((sum, row) => sum + (row.as_is?.total || 0), 0);
      const legacyPostRenoTotal = legacyRows.reduce((sum, row) => sum + (row.post_reno?.total || 0), 0);

      // Create the "Management & Reserves" parent category for calculated items
      const managementReservesCategory = {
        line_item_key: 'opex_parent_management_reserves',
        label: 'Management & Reserves',
        parent_category: 'management_reserves',
        level: 0,
        is_calculated: true,
        is_expanded: true,
        as_is: {
          rate: unitCount > 0 ? (managementFeeAsIs + replacementReserves) / unitCount / 12 : null,
          total: managementFeeAsIs + replacementReserves
        },
        post_reno: {
          rate: unitCount > 0 ? (managementFeePostReno + replacementReserves) / unitCount / 12 : null,
          total: managementFeePostReno + replacementReserves
        },
        evidence: {},
        children: calculatedExpenseRows
      };

      // Add the management & reserves category to the expense rows
      const allOpexRows = [...legacyRows, managementReservesCategory];

      const totalBaseOpex = legacyTotal;
      const totalCalculatedExpenses = managementFeeAsIs + replacementReserves;
      const totalOperatingExpenses = totalBaseOpex + totalCalculatedExpenses;

      const totalBaseOpexPostReno = legacyPostRenoTotal;
      const totalCalculatedExpensesPostReno = managementFeePostReno + replacementReserves;
      const totalOperatingExpensesPostReno = totalBaseOpexPostReno + totalCalculatedExpensesPostReno;

      const operatingExpenses = {
        section_type: 'hierarchical' as const,
        rows: allOpexRows,
        section_total: {
          as_is: totalOperatingExpenses,
          post_reno: totalOperatingExpensesPostReno
        },
        // Expose the calculated components separately for transparency
        calculated: {
          management_fee: managementFeeAsIs,
          management_fee_pct: managementFeePct,
          replacement_reserves: replacementReserves,
          reserves_per_unit: reservesPerUnit
        }
      };

      const asIsNOI = effectiveGrossIncome - totalOperatingExpenses;
      const marketNOI = effectiveGrossIncomeMarket - totalOperatingExpenses;
      const postRenoNOI = postRenoEGI - totalOperatingExpensesPostReno;

      const noiUplift = postRenoNOI - asIsNOI;
      const noiUpliftPercent = asIsNOI !== 0 ? noiUplift / asIsNOI : 0;

      return NextResponse.json({
        project_id: projectIdNum,
        project_type_code: project.project_type_code,
        analysis_type: analysisType,
        property_summary: {
          unit_count: unitCount,
          total_sf: totalSF,
          avg_unit_sf: unitCount > 0 ? totalSF / unitCount : 0
        },
        value_add_enabled: valueAddEnabled,
        has_detailed_rent_roll: hasDetailedRentRoll,
        calculated_physical_vacancy: calculatedPhysicalVacancy,
        assumptions: {
          physical_vacancy_pct: physicalVacancyRate,
          credit_loss_pct: creditLossRate,
          concessions_pct: concessionsRate,
          management_fee_pct: managementFeePct,
          reserves_per_unit: reservesPerUnit
        },
        rental_income: rentalIncome,
        vacancy_deductions: vacancyDeductions,
        other_income: otherIncome,
        operating_expenses: operatingExpenses,
        totals: {
          gross_potential_rent: grossPotentialRent,
          gross_potential_rent_market: grossPotentialRentMarket,
          net_rental_income: netRentalIncome,
          net_rental_income_market: netRentalIncomeMarket,
          total_other_income: totalOtherIncome,
          effective_gross_income: effectiveGrossIncome,
          effective_gross_income_market: effectiveGrossIncomeMarket,
          total_operating_expenses: totalOperatingExpenses,
          base_operating_expenses: totalBaseOpex,
          management_fee: managementFeeAsIs,
          replacement_reserves: replacementReserves,
          as_is_noi: asIsNOI,
          market_noi: marketNOI,
          post_reno_noi: postRenoNOI,
          noi_uplift: noiUplift,
          noi_uplift_percent: noiUpliftPercent
        },
        available_scenarios: availableScenarios,
        preferred_scenario: preferredScenario
      });
    }

    // Fall back to CoA-based hierarchy if no legacy opex rows exist
    // Calculate section totals from the parent category totals (which sum their leaf children)
    const coaBaseTotal = filteredCategories.reduce((sum, cat) => sum + (cat.as_is?.total || 0), 0);
    const coaBasePostRenoTotal = filteredCategories.reduce((sum, cat) => sum + (cat.post_reno?.total || 0), 0);

    // Calculate EGI for this code path (needed for Management Fee)
    const coaGPR = rentalIncome.section_total.as_is;
    const coaGPRMarket = rentalIncome.section_total.as_is_market || rentalIncome.section_total.as_is;
    const coaNRI = coaGPR + vacancyDeductions.section_total.as_is;
    const coaNRIMarket = coaGPRMarket + (vacancyDeductions.section_total.as_is_market || vacancyDeductions.section_total.as_is);
    const coaOtherIncome = otherIncome.section_total.as_is;
    const coaEGI = coaNRI + coaOtherIncome;
    const coaEGIMarket = coaNRIMarket + coaOtherIncome;

    const coaPostRenoGPR = rentalIncome.section_total.post_reno;
    const coaPostRenoNRI = coaPostRenoGPR + vacancyDeductions.section_total.post_reno;
    const coaPostRenoEGI = coaPostRenoNRI + otherIncome.section_total.post_reno;

    // Calculate Management Fee (EGI × management_fee_pct) for CoA path
    const coaManagementFeePct = assumptions.management_fee_pct;
    const coaManagementFeeAsIs = coaEGI * coaManagementFeePct;
    const coaManagementFeeMarket = coaEGIMarket * coaManagementFeePct;
    const coaManagementFeePostReno = coaPostRenoEGI * coaManagementFeePct;

    // Calculate Replacement Reserves (reserves_per_unit × unit_count) for CoA path
    const coaReservesPerUnit = assumptions.replacement_reserve_pct;
    const coaReplacementReserves = coaReservesPerUnit * unitCount;

    // Create calculated expense rows for Management Fee and Replacement Reserves
    // NOTE: is_calculated must be false so the UI renders these as flat child rows,
    // not as collapsible parent/accordion rows. is_readonly prevents editing.
    const coaCalculatedExpenseRows = [
      {
        line_item_key: 'calculated_management_fee',
        label: `Management Fee (${(coaManagementFeePct * 100).toFixed(1)}%)`,
        level: 1,
        is_calculated: false,
        is_readonly: true,
        is_percentage: true,
        parent_category: 'management_reserves',
        calculation_base: 'egi',
        as_is: {
          rate: coaManagementFeePct,
          total: coaManagementFeeAsIs
        },
        post_reno: {
          rate: coaManagementFeePct,
          total: coaManagementFeePostReno
        },
        evidence: {},
        children: []
      },
      {
        line_item_key: 'calculated_replacement_reserves',
        label: `Replacement Reserves ($${coaReservesPerUnit.toFixed(0)}/unit)`,
        level: 1,
        is_calculated: false,
        is_readonly: true,
        parent_category: 'management_reserves',
        as_is: {
          rate: coaReservesPerUnit,
          total: coaReplacementReserves
        },
        post_reno: {
          rate: coaReservesPerUnit,
          total: coaReplacementReserves
        },
        evidence: {},
        children: []
      }
    ];

    // Create the "Management & Reserves" parent category for CoA path
    const coaManagementReservesCategory = {
      line_item_key: 'opex_parent_management_reserves',
      label: 'Management & Reserves',
      parent_category: 'management_reserves',
      level: 0,
      is_calculated: true,
      is_expanded: true,
      as_is: {
        rate: unitCount > 0 ? (coaManagementFeeAsIs + coaReplacementReserves) / unitCount / 12 : null,
        total: coaManagementFeeAsIs + coaReplacementReserves
      },
      post_reno: {
        rate: unitCount > 0 ? (coaManagementFeePostReno + coaReplacementReserves) / unitCount / 12 : null,
        total: coaManagementFeePostReno + coaReplacementReserves
      },
      evidence: {},
      children: coaCalculatedExpenseRows
    };

    // Add calculated expenses to the CoA-based rows
    const allCoaOpexRows = [...filteredCategories, coaManagementReservesCategory];

    const coaTotalCalculatedExpenses = coaManagementFeeAsIs + coaReplacementReserves;
    const coaTotalOperatingExpenses = coaBaseTotal + coaTotalCalculatedExpenses;
    const coaTotalCalculatedExpensesPostReno = coaManagementFeePostReno + coaReplacementReserves;
    const coaTotalOperatingExpensesPostReno = coaBasePostRenoTotal + coaTotalCalculatedExpensesPostReno;

    const operatingExpenses = {
      section_type: 'hierarchical' as const,
      rows: allCoaOpexRows,
      section_total: {
        as_is: coaTotalOperatingExpenses,
        post_reno: coaTotalOperatingExpensesPostReno
      },
      // Expose the calculated components separately for transparency
      calculated: {
        management_fee: coaManagementFeeAsIs,
        management_fee_pct: coaManagementFeePct,
        replacement_reserves: coaReplacementReserves,
        reserves_per_unit: coaReservesPerUnit
      }
    };

    // 8. Calculate totals with calculated expenses included
    const asIsNOI = coaEGI - coaTotalOperatingExpenses;
    const marketNOI = coaEGIMarket - coaTotalOperatingExpenses;
    const postRenoNOI = coaPostRenoEGI - coaTotalOperatingExpensesPostReno;

    const noiUplift = postRenoNOI - asIsNOI;
    const noiUpliftPercent = asIsNOI !== 0 ? noiUplift / asIsNOI : 0;

    return NextResponse.json({
      project_id: projectIdNum,
      project_type_code: project.project_type_code,
      analysis_type: analysisType,
      property_summary: {
        unit_count: unitCount,
        total_sf: totalSF,
        avg_unit_sf: unitCount > 0 ? totalSF / unitCount : 0
      },
      value_add_enabled: valueAddEnabled,
      has_detailed_rent_roll: hasDetailedRentRoll,
      calculated_physical_vacancy: calculatedPhysicalVacancy,
      assumptions: {
        physical_vacancy_pct: physicalVacancyRate,
        credit_loss_pct: creditLossRate,
        concessions_pct: concessionsRate,
        management_fee_pct: coaManagementFeePct,
        reserves_per_unit: coaReservesPerUnit
      },
      rental_income: rentalIncome,
      vacancy_deductions: vacancyDeductions,
      other_income: otherIncome,
      operating_expenses: operatingExpenses,
      totals: {
        // Current rent totals (F-12 Current)
        gross_potential_rent: coaGPR,
        gross_potential_rent_market: coaGPRMarket, // Market GPR (F-12 Market)
        net_rental_income: coaNRI,
        net_rental_income_market: coaNRIMarket,
        total_other_income: coaOtherIncome,
        effective_gross_income: coaEGI,
        effective_gross_income_market: coaEGIMarket,
        total_operating_expenses: coaTotalOperatingExpenses,
        base_operating_expenses: coaBaseTotal,
        management_fee: coaManagementFeeAsIs,
        replacement_reserves: coaReplacementReserves,
        as_is_noi: asIsNOI, // F-12 Current NOI
        market_noi: marketNOI, // F-12 Market NOI
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
