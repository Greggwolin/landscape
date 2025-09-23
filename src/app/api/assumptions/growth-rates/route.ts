import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'
import type { Assumptionrule } from '../../../../types/database'
import {
  validateGrowthRateCreate,
  validateGrowthRateUpdate,
  hasValidationErrors,
  formatValidationErrors
} from '../../../../lib/validation/growth-rates'

// Growth rate assumption types
interface GrowthRateStep {
  step: number;
  period: number;
  rate: string;
  periods: string | number;
  thru: number;
  product?: string;
  timing?: string;
}

interface GrowthRateImpact {
  dollarAmount: string;
  percentOfProject: string;
  irrImpact: string;
}

interface GrowthRateAssumption {
  id: number;
  name: string;
  category: string;
  globalRate: string;
  steps: GrowthRateStep[];
  impact: GrowthRateImpact;
  tabs: Array<{ label: string; content: string }>;
}

// Interface for API response (currently unused but may be needed for future features)
// interface GrowthRatesResponse {
//   assumptions: GrowthRateAssumption[];
// }

// Default growth rate assumptions
const DEFAULT_ASSUMPTIONS: GrowthRateAssumption[] = [
  {
    id: 1,
    name: "Development Costs",
    category: "DEVELOPMENT_COSTS",
    globalRate: "2.75%",
    steps: [
      { step: 1, period: 1, rate: "2.0%", periods: 16, thru: 16 },
      { step: 2, period: 17, rate: "3.0%", periods: 24, thru: 40 },
      { step: 3, period: 41, rate: "2.5%", periods: 20, thru: 44 },
      { step: 4, period: 45, rate: "2.0%", periods: "E", thru: 180 }
    ],
    impact: {
      dollarAmount: "$12.3M",
      percentOfProject: "24.1%",
      irrImpact: "-210"
    },
    tabs: [
      { label: "Steps", content: "step-based" },
      { label: "Sensitivity", content: "sensitivity" },
      { label: "History", content: "historical" }
    ]
  },
  {
    id: 2,
    name: "Price Appreciation",
    category: "PRICE_APPRECIATION",
    globalRate: "3.8%",
    steps: [
      { step: 1, period: 1, rate: "4.5%", periods: 12, thru: 12 },
      { step: 2, period: 13, rate: "3.8%", periods: 24, thru: 36 },
      { step: 3, period: 37, rate: "3.2%", periods: 24, thru: 60 }
    ],
    impact: {
      dollarAmount: "$27.1M",
      percentOfProject: "18.7%",
      irrImpact: "+380"
    },
    tabs: [
      { label: "Steps", content: "step-based" },
      { label: "Sensitivity", content: "sensitivity" },
      { label: "History", content: "historical" }
    ]
  },
  {
    id: 3,
    name: "Sales Absorption",
    category: "SALES_ABSORPTION",
    globalRate: "7.5/mo",
    steps: [
      { step: 1, period: 1, rate: "8/mo", periods: 24, thru: 24 },
      { step: 2, period: 25, rate: "12/mo", periods: 36, thru: 60 },
      { step: 3, period: 61, rate: "6/mo", periods: 24, thru: 84 },
      { step: 4, period: 85, rate: "4/mo", periods: "E", thru: 180 }
    ],
    impact: {
      dollarAmount: "$45.2M",
      percentOfProject: "31.2%",
      irrImpact: "+430"
    },
    tabs: [
      { label: "Steps", content: "step-based" },
      { label: "Sensitivity", content: "sensitivity" },
      { label: "History", content: "historical" }
    ]
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      // Return default assumptions if no project specified
      return NextResponse.json({ assumptions: DEFAULT_ASSUMPTIONS })
    }

    // Try to fetch project-specific growth rate assumptions
    const rows = await sql<Assumptionrule>`
      SELECT rule_id, rule_category, rule_key, rule_value
      FROM landscape.tbl_assumptionrule
      WHERE rule_category IN ('DEVELOPMENT_COSTS', 'PRICE_APPRECIATION', 'SALES_ABSORPTION', 'GROWTH_RATES')
      AND (rule_key LIKE ${'%_PROJECT_' + projectId} OR rule_key LIKE '%_GLOBAL')
      ORDER BY rule_category, rule_key
    `

    if (!rows || rows.length === 0) {
      // If no project-specific data, return defaults
      return NextResponse.json({ assumptions: DEFAULT_ASSUMPTIONS })
    }

    // Parse stored assumptions and merge with defaults
    const assumptions: GrowthRateAssumption[] = []
    const categoriesFound = new Set<string>()

    for (const row of rows) {
      try {
        const ruleValue = typeof row.ruleValue === 'string'
          ? JSON.parse(row.ruleValue)
          : row.ruleValue

        if (ruleValue && row.ruleCategory) {
          categoriesFound.add(row.ruleCategory)

          const assumption: GrowthRateAssumption = {
            id: row.ruleId,
            name: getCategoryDisplayName(row.ruleCategory),
            category: row.ruleCategory,
            globalRate: ruleValue.globalRate || "0%",
            steps: ruleValue.steps || [],
            impact: ruleValue.impact || { dollarAmount: "$0", percentOfProject: "0%", irrImpact: "0" },
            tabs: ruleValue.tabs || [
              { label: "Steps", content: "step-based" },
              { label: "Sensitivity", content: "sensitivity" },
              { label: "History", content: "historical" }
            ]
          }
          assumptions.push(assumption)
        }
      } catch (parseError) {
        console.warn(`Failed to parse rule_value for rule_id ${row.ruleId}:`, parseError)
      }
    }

    // Add default assumptions for missing categories
    for (const defaultAssumption of DEFAULT_ASSUMPTIONS) {
      if (!categoriesFound.has(defaultAssumption.category)) {
        assumptions.push(defaultAssumption)
      }
    }

    return NextResponse.json({ assumptions })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Growth rates GET error:', err)
    return NextResponse.json({
      error: 'Failed to fetch growth rate assumptions',
      details: msg
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, projectId, globalRate, steps, impact } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'Assumption ID required' }, { status: 400 })
    }

    // Validate the request
    const validationErrors = validateGrowthRateUpdate(body)
    if (hasValidationErrors(validationErrors)) {
      return NextResponse.json({
        error: 'Validation failed',
        details: formatValidationErrors(validationErrors),
        validationErrors
      }, { status: 400 })
    }

    // First, get the existing assumption to understand its category
    const existingRows = await sql<Assumptionrule>`
      SELECT rule_id, rule_category, rule_key, rule_value
      FROM landscape.tbl_assumptionrule
      WHERE rule_id = ${id}
      LIMIT 1
    `

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ error: 'Assumption not found' }, { status: 404 })
    }

    const existing = existingRows[0]
    const existingValue = typeof existing.ruleValue === 'string'
      ? JSON.parse(existing.ruleValue)
      : existing.ruleValue

    // Update the rule value with new data
    const updatedValue = {
      ...existingValue,
      ...(globalRate && { globalRate }),
      ...(steps && { steps }),
      ...(impact && { impact }),
      tabs: (existingValue && existingValue.tabs) || [
        { label: "Steps", content: "step-based" },
        { label: "Sensitivity", content: "sensitivity" },
        { label: "History", content: "historical" }
      ]
    }

    // If projectId is provided, create a project-specific rule
    let ruleKey = existing.ruleKey
    if (projectId && !ruleKey?.includes(`_PROJECT_${projectId}`)) {
      ruleKey = ruleKey?.replace('_GLOBAL', `_PROJECT_${projectId}`) || `${existing.ruleCategory}_PROJECT_${projectId}`
    }

    const updatedRows = await sql<Assumptionrule>`
      UPDATE landscape.tbl_assumptionrule
      SET rule_value = ${JSON.stringify(updatedValue)}
      WHERE rule_id = ${id}
      RETURNING rule_id, rule_category, rule_key, rule_value
    `

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'No rows updated' }, { status: 404 })
    }

    const result = updatedRows[0]
    console.log('Update result:', result)

    let resultValue
    try {
      // Fix: Use snake_case field name from database
      const rawValue = result.rule_value || result.ruleValue
      resultValue = typeof rawValue === 'string'
        ? JSON.parse(rawValue)
        : rawValue
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw value:', result.rule_value)
      return NextResponse.json({ error: 'Invalid JSON in rule value' }, { status: 500 })
    }

    console.log('Parsed result value:', resultValue)

    if (!resultValue) {
      return NextResponse.json({ error: 'Invalid rule value after update' }, { status: 500 })
    }

    return NextResponse.json({
      id: result.rule_id || result.ruleId,
      name: getCategoryDisplayName(result.rule_category || result.ruleCategory || ''),
      category: result.rule_category || result.ruleCategory,
      globalRate: resultValue.globalRate || '',
      steps: resultValue.steps || [],
      impact: resultValue.impact || { dollarAmount: '$0', percentOfProject: '0%', irrImpact: '0' },
      tabs: resultValue.tabs || [
        { label: "Steps", content: "step-based" },
        { label: "Sensitivity", content: "sensitivity" },
        { label: "History", content: "historical" }
      ]
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Growth rates PUT error:', err)
    return NextResponse.json({
      error: 'Failed to update growth rate assumption',
      details: msg
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, category, name, globalRate, steps, impact } = body ?? {}

    if (!category || !name) {
      return NextResponse.json({ error: 'Category and name required' }, { status: 400 })
    }

    // Validate the request
    const validationErrors = validateGrowthRateCreate(body)
    if (hasValidationErrors(validationErrors)) {
      return NextResponse.json({
        error: 'Validation failed',
        details: formatValidationErrors(validationErrors),
        validationErrors
      }, { status: 400 })
    }

    const ruleKey = projectId
      ? `${category}_PROJECT_${projectId}`
      : `${category}_GLOBAL`

    const ruleValue = {
      globalRate: globalRate || "0%",
      steps: steps || [],
      impact: impact || { dollarAmount: "$0", percentOfProject: "0%", irrImpact: "0" },
      tabs: [
        { label: "Steps", content: "step-based" },
        { label: "Sensitivity", content: "sensitivity" },
        { label: "History", content: "historical" }
      ]
    }

    const rows = await sql<Assumptionrule>`
      INSERT INTO landscape.tbl_assumptionrule (rule_category, rule_key, rule_value)
      VALUES (${category}, ${ruleKey}, ${JSON.stringify(ruleValue)})
      RETURNING rule_id, rule_category, rule_key, rule_value
    `

    const result = rows[0]
    const resultValue = typeof result.ruleValue === 'string'
      ? JSON.parse(result.ruleValue)
      : result.ruleValue

    return NextResponse.json({
      id: result.ruleId,
      name: getCategoryDisplayName(result.ruleCategory || ''),
      category: result.ruleCategory,
      globalRate: resultValue.globalRate,
      steps: resultValue.steps,
      impact: resultValue.impact,
      tabs: resultValue.tabs
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Growth rates POST error:', err)
    return NextResponse.json({
      error: 'Failed to create growth rate assumption',
      details: msg
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Assumption ID required' }, { status: 400 })
    }

    const deletedRows = await sql<Assumptionrule>`
      DELETE FROM landscape.tbl_assumptionrule
      WHERE rule_id = ${parseInt(id)}
      RETURNING rule_id
    `

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Assumption not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: deletedRows[0].ruleId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Growth rates DELETE error:', err)
    return NextResponse.json({
      error: 'Failed to delete growth rate assumption',
      details: msg
    }, { status: 500 })
  }
}

function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'DEVELOPMENT_COSTS': return 'Development Costs'
    case 'PRICE_APPRECIATION': return 'Price Appreciation'
    case 'SALES_ABSORPTION': return 'Sales Absorption'
    default: return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
}