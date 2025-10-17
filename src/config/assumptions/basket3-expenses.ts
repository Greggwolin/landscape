import { BasketConfig } from '@/types/assumptions';

export const basket3Config: BasketConfig = {
  basketId: 3,
  basketName: "The Cash Out",
  basketDescription: "Operating expenses and capital expenditures.",
  icon: "trending-down",
  tableName: "tbl_operating_expense",
  relatedTables: ['tbl_capex_reserve', 'tbl_expense_detail'],

  fieldGroups: [
    {
      id: 'opex_basics',
      label: 'Operating Expense Basics',
      tier: 'napkin',
      fields: [
        'total_opex_per_unit_annual',
        'management_fee_pct'
      ]
    },
    {
      id: 'opex_major_categories',
      label: 'Operating Expenses - Major Categories',
      tier: 'mid',
      fields: [
        'property_taxes_annual',
        'insurance_annual',
        'utilities_annual',
        'repairs_maintenance_annual',
        'payroll_annual',
        'marketing_leasing_annual'
      ]
    },
    {
      id: 'opex_other_categories',
      label: 'Operating Expenses - Other',
      tier: 'mid',
      collapsible: true,
      fields: [
        'admin_legal_annual',
        'landscaping_annual',
        'trash_removal_annual',
        'pest_control_annual',
        'security_annual',
        'other_expenses_annual'
      ]
    },
    {
      id: 'capex_basics',
      label: 'Capital Expenditures',
      tier: 'napkin',
      fields: [
        'capex_per_unit_annual'
      ]
    },
    {
      id: 'capex_reserves',
      label: 'CapEx Reserves by Category',
      tier: 'mid',
      collapsible: true,
      fields: [
        'immediate_capex',
        'roof_reserve_per_unit',
        'hvac_reserve_per_unit',
        'appliance_reserve_per_unit',
        'other_reserve_per_unit'
      ]
    },
    {
      id: 'capex_schedule',
      label: 'CapEx Schedule - Major Items',
      tier: 'pro',
      collapsible: true,
      fields: [
        'roof_replacement_year',
        'roof_replacement_cost',
        'hvac_replacement_cycle_years',
        'hvac_replacement_cost_per_unit',
        'parking_lot_reseal_year',
        'parking_lot_reseal_cost',
        'exterior_paint_cycle_years',
        'exterior_paint_cost',
        'elevator_modernization_cost',
        'unit_renovation_per_turn'
      ]
    }
  ],

  fields: [
    // OPERATING EXPENSES - NAPKIN TIER
    {
      key: 'total_opex_per_unit_annual',
      label: 'Operating Expenses per Unit',
      type: 'currency',
      tier: 'napkin',
      required: true,
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "Total annual operating costs per unit. Includes property taxes, insurance, utilities, maintenance, payroll, etc. $5-8K typical for multifamily.",
        mid: "Total annual operating expenses per unit (excluding debt service and CapEx). Use for quick underwriting. Typical: $5-8K/unit depending on market and property age.",
        pro: "Aggregate annual OpEx per unit. Should reconcile to itemized categories below. Benchmark against submarket comps. Excludes debt service, CapEx, depreciation."
      }
    },
    {
      key: 'management_fee_pct',
      label: 'Management Fee',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 10 },
      helpText: {
        napkin: "Property management fee as % of collected rent. 3-5% typical for third-party management.",
        mid: "Property management fee as % of effective gross income (EGI). 3% typical for institutional third-party. May be lower for self-management.",
        pro: "PM fee as % of EGI or collected rent. Structure varies: flat % of EGI, tiered based on performance, or fixed fee. Confirm fee base (gross vs net of vacancy)."
      }
    },

    // OPERATING EXPENSES - MID TIER (MAJOR CATEGORIES)
    {
      key: 'property_taxes_annual',
      label: 'Property Taxes',
      type: 'currency',
      tier: 'mid',
      group: 'opex_major_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual property taxes. Typically largest OpEx line item for multifamily. Calculate as assessed value × local tax rate.",
        pro: "Annual ad valorem property taxes. Reassess post-acquisition based on purchase price. Check for tax abatements, exemptions, appeal opportunities."
      }
    },
    {
      key: 'insurance_annual',
      label: 'Insurance',
      type: 'currency',
      tier: 'mid',
      group: 'opex_major_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual property insurance. Includes liability, property, loss of rents. $500-1500/unit typical. Higher in coastal/disaster zones.",
        pro: "Annual insurance premiums: property, liability, loss of rents, flood (if required), earthquake (if applicable). Get updated quotes post-acquisition."
      }
    },
    {
      key: 'utilities_annual',
      label: 'Utilities',
      type: 'currency',
      tier: 'mid',
      group: 'opex_major_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual utilities: electric, gas, water, sewer for common areas (tenants pay their own units). $300-800/unit typical.",
        pro: "Common area utilities: electric (corridors, exterior), gas (pool heaters), water/sewer (irrigation, common). Separately track if master-metered."
      }
    },
    {
      key: 'repairs_maintenance_annual',
      label: 'Repairs & Maintenance',
      type: 'currency',
      tier: 'mid',
      group: 'opex_major_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual repairs and maintenance. Includes preventive maintenance, emergency repairs, unit turns. $800-1500/unit typical.",
        pro: "R&M expenses: routine maintenance, unit make-ready, preventive maintenance programs. Excludes major CapEx. Higher for older properties."
      }
    },
    {
      key: 'payroll_annual',
      label: 'Payroll',
      type: 'currency',
      tier: 'mid',
      group: 'opex_major_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual on-site payroll: property manager, leasing agents, maintenance techs. $600-1200/unit typical depending on property size.",
        pro: "On-site personnel costs: wages, benefits, payroll taxes. Staffing model varies by unit count. Exclude off-site corporate management (captured in PM fee)."
      }
    },
    {
      key: 'marketing_leasing_annual',
      label: 'Marketing & Leasing',
      type: 'currency',
      tier: 'mid',
      group: 'opex_major_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual marketing and leasing costs: advertising, ILS (internet listing services), leasing commissions, resident events. $200-500/unit.",
        pro: "Marketing expenses: ILS fees (Apartments.com, Zillow), SEO/PPC, collateral, model units, broker co-ops, resident retention programs."
      }
    },

    // OPERATING EXPENSES - MID TIER (OTHER CATEGORIES)
    {
      key: 'admin_legal_annual',
      label: 'Administrative & Legal',
      type: 'currency',
      tier: 'mid',
      group: 'opex_other_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual admin and legal: accounting, legal fees, office supplies, software subscriptions. $100-300/unit.",
        pro: "Administrative costs: accounting/bookkeeping, legal (evictions, contracts), office supplies, property management software, licenses/permits."
      }
    },
    {
      key: 'landscaping_annual',
      label: 'Landscaping',
      type: 'currency',
      tier: 'mid',
      group: 'opex_other_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual landscaping and grounds maintenance. $150-400/unit depending on property size and amenities.",
        pro: "Landscaping/grounds: mowing, trimming, seasonal plantings, irrigation, snow removal (if applicable). Often contracted service."
      }
    },
    {
      key: 'trash_removal_annual',
      label: 'Trash Removal',
      type: 'currency',
      tier: 'mid',
      group: 'opex_other_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual trash and recycling service. $80-200/unit. Varies by service frequency and compactor vs dumpster.",
        pro: "Waste management: trash pickup, recycling, bulk item removal. Frequency and cost vary by provider and container type (compactor more efficient for 100+ units)."
      }
    },
    {
      key: 'pest_control_annual',
      label: 'Pest Control',
      type: 'currency',
      tier: 'mid',
      group: 'opex_other_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual pest control services. $30-80/unit. Typically monthly service contract.",
        pro: "Pest control: routine preventive service, emergency treatments. Tenant-caused infestations may be billable to tenant depending on lease terms."
      }
    },
    {
      key: 'security_annual',
      label: 'Security',
      type: 'currency',
      tier: 'mid',
      group: 'opex_other_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual security costs: gate systems, cameras, patrol services if applicable. $50-200/unit depending on security level.",
        pro: "Security expenses: access control systems, CCTV monitoring, patrol services (if Class A), gate maintenance. Higher in urban locations."
      }
    },
    {
      key: 'other_expenses_annual',
      label: 'Other Expenses',
      type: 'currency',
      tier: 'mid',
      group: 'opex_other_categories',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Catchall for miscellaneous operating expenses not categorized above.",
        pro: "Other OpEx: elevator maintenance, pool service, fitness equipment service, fire alarm monitoring, etc. Itemize significant line items."
      }
    },

    // CAPEX - NAPKIN TIER
    {
      key: 'capex_per_unit_annual',
      label: 'CapEx per Unit (Annual)',
      type: 'currency',
      tier: 'napkin',
      required: true,
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "Annual capital expenditure reserve per unit. $300-500 typical for multifamily. Covers roof, HVAC, appliances, parking lot, exterior paint, etc.",
        mid: "Annual CapEx reserve per unit. Lender-required minimum often $250-300/unit. Actual spend may be lumpy (major items every 5-10 years).",
        pro: "Annual CapEx reserve per unit. Should align with property condition assessment (PCA) 12-year forecast. Normalize major items over useful life."
      }
    },

    // CAPEX - MID TIER
    {
      key: 'immediate_capex',
      label: 'Immediate CapEx (Year 1)',
      type: 'currency',
      tier: 'mid',
      group: 'capex_reserves',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "One-time CapEx in Year 1 for deferred maintenance or value-add renovations. Separate from ongoing annual reserves.",
        pro: "Year 1 CapEx for immediate needs: deferred maintenance, unit renovations, amenity upgrades. Budget separately from ongoing reserves."
      }
    },
    {
      key: 'roof_reserve_per_unit',
      label: 'Roof Reserve',
      type: 'currency',
      tier: 'mid',
      group: 'capex_reserves',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Annual per-unit reserve for roof replacement. Typical: $50-100/unit depending on roof age and type.",
        pro: "Annual roof reserve per unit. Roof life: 20-30 years depending on material (TPO, shingle, tile). Amortize replacement cost over remaining useful life."
      }
    },
    {
      key: 'hvac_reserve_per_unit',
      label: 'HVAC Reserve',
      type: 'currency',
      tier: 'mid',
      group: 'capex_reserves',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Annual per-unit reserve for HVAC replacement. Typical: $75-125/unit. Units typically need replacement every 12-15 years.",
        pro: "Annual HVAC reserve per unit. HVAC life: 12-15 years. Track by unit if central vs individual systems. Budget more for package units (higher cost)."
      }
    },
    {
      key: 'appliance_reserve_per_unit',
      label: 'Appliance Reserve',
      type: 'currency',
      tier: 'mid',
      group: 'capex_reserves',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Annual per-unit reserve for appliance replacement: refrigerator, stove, dishwasher, microwave. Typical: $100-150/unit.",
        pro: "Annual appliance reserve per unit. Appliance life: 8-12 years. Cost per set: $1,200-2,000 for mid-grade. Budget for gradual replacement."
      }
    },
    {
      key: 'other_reserve_per_unit',
      label: 'Other Reserve',
      type: 'currency',
      tier: 'mid',
      group: 'capex_reserves',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Annual per-unit reserve for other capital items: flooring, cabinets, countertops, plumbing fixtures, etc.",
        pro: "Other CapEx reserves: flooring (7-10yr cycle), cabinets/counters (15-20yr), plumbing fixtures, lighting, common area refreshes."
      }
    },

    // CAPEX - PRO TIER (SCHEDULED MAJOR ITEMS)
    {
      key: 'roof_replacement_year',
      label: 'Roof Replacement Year',
      type: 'number',
      tier: 'pro',
      group: 'capex_schedule',
      format: { suffix: '', decimals: 0 },
      validation: { min: 1, max: 30 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Year of anticipated roof replacement (within hold period). Leave blank if no replacement needed during hold. Used for cashflow timing."
      }
    },
    {
      key: 'roof_replacement_cost',
      label: 'Roof Replacement Cost',
      type: 'currency',
      tier: 'pro',
      group: 'capex_schedule',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Total roof replacement cost. Typical: $10-25/SF depending on roof type. Get quote from PCA or roofing contractor."
      }
    },
    {
      key: 'hvac_replacement_cycle_years',
      label: 'HVAC Replacement Cycle',
      type: 'number',
      tier: 'pro',
      group: 'capex_schedule',
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 8, max: 20 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "HVAC replacement cycle in years (useful life). 12-15 years typical. Used to forecast replacement needs throughout hold period."
      }
    },
    {
      key: 'hvac_replacement_cost_per_unit',
      label: 'HVAC Replacement Cost per Unit',
      type: 'currency',
      tier: 'pro',
      group: 'capex_schedule',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "HVAC replacement cost per unit. $1,500-3,500 depending on system type (window unit vs package vs split system). Get contractor quotes."
      }
    },
    {
      key: 'parking_lot_reseal_year',
      label: 'Parking Lot Reseal Year',
      type: 'number',
      tier: 'pro',
      group: 'capex_schedule',
      format: { suffix: '', decimals: 0 },
      validation: { min: 1, max: 30 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Year for parking lot seal coating/striping. Typically every 3-5 years. Full repaving: 15-20 years."
      }
    },
    {
      key: 'parking_lot_reseal_cost',
      label: 'Parking Lot Reseal Cost',
      type: 'currency',
      tier: 'pro',
      group: 'capex_schedule',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Parking lot seal coating cost. $1-3/SF typical for seal coat. $5-10/SF for repaving. Budget includes striping/signage."
      }
    },
    {
      key: 'exterior_paint_cycle_years',
      label: 'Exterior Paint Cycle',
      type: 'number',
      tier: 'pro',
      group: 'capex_schedule',
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 5, max: 15 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Exterior paint cycle (years between full repaints). 7-10 years typical for stucco/wood siding. Longer for brick/masonry."
      }
    },
    {
      key: 'exterior_paint_cost',
      label: 'Exterior Paint Cost',
      type: 'currency',
      tier: 'pro',
      group: 'capex_schedule',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Total exterior paint cost. $300-800/unit typical. Varies by building material and prep work required. Get contractor bids."
      }
    },
    {
      key: 'elevator_modernization_cost',
      label: 'Elevator Modernization',
      type: 'currency',
      tier: 'pro',
      group: 'capex_schedule',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Elevator modernization cost (if applicable). $100-150K per elevator for full modernization. Controller upgrade: $30-50K. 20-25 year cycle."
      }
    },
    {
      key: 'unit_renovation_per_turn',
      label: 'Unit Renovation per Turn',
      type: 'currency',
      tier: 'pro',
      group: 'capex_schedule',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Capital improvement per unit at turnover (value-add renovations): upgraded flooring, cabinets, counters, fixtures. $3-15K per unit depending on scope."
      }
    }
  ]
};
