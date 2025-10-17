import { BasketConfig } from '@/types/assumptions';

export const basket2Config: BasketConfig = {
  basketId: 2,
  basketName: "The Cash In",
  basketDescription: "How much money comes in? Rent, other income, vacancy.",
  icon: "dollar-sign",
  tableName: "tbl_revenue_rent",
  relatedTables: ['tbl_revenue_other', 'tbl_vacancy_assumption', 'tbl_rent_roll_unit'],

  fieldGroups: [
    {
      id: 'rent_basics',
      label: 'Rent Basics',
      tier: 'napkin',
      fields: [
        'current_rent_psf',
        'occupancy_pct',
        'annual_rent_growth_pct'
      ]
    },
    {
      id: 'rent_details',
      label: 'Rent Details',
      tier: 'mid',
      fields: [
        'in_place_rent_psf',
        'market_rent_psf',
        'rent_loss_to_lease_pct',
        'lease_up_months',
        'stabilized_occupancy_pct',
        'rent_growth_years_1_3_pct',
        'rent_growth_stabilized_pct'
      ]
    },
    {
      id: 'leasing_costs',
      label: 'Leasing Costs',
      tier: 'mid',
      fields: [
        'free_rent_months',
        'ti_allowance_per_unit',
        'renewal_probability_pct'
      ]
    },
    {
      id: 'other_income_basics',
      label: 'Other Income',
      tier: 'napkin',
      fields: [
        'other_income_per_unit_monthly'
      ]
    },
    {
      id: 'other_income_itemized',
      label: 'Other Income - Itemized',
      tier: 'mid',
      collapsible: true,
      fields: [
        'parking_income_per_space',
        'parking_spaces',
        'pet_fee_per_pet',
        'pet_penetration_pct',
        'laundry_income_per_unit',
        'storage_income_per_unit',
        'application_fees_annual'
      ]
    },
    {
      id: 'other_income_pro',
      label: 'Other Income - Additional Sources',
      tier: 'pro',
      collapsible: true,
      fields: [
        'late_fees_annual',
        'utility_reimbursements_annual',
        'furnished_unit_premium_pct',
        'short_term_rental_income',
        'ancillary_services_income',
        'vending_income',
        'package_locker_fees',
        'reserved_parking_premium',
        'ev_charging_fees',
        'other_miscellaneous'
      ]
    },
    {
      id: 'vacancy_basics',
      label: 'Vacancy & Credit Loss',
      tier: 'napkin',
      fields: [
        'vacancy_loss_pct',
        'collection_loss_pct'
      ]
    },
    {
      id: 'vacancy_details',
      label: 'Vacancy Details',
      tier: 'mid',
      collapsible: true,
      fields: [
        'physical_vacancy_pct',
        'economic_vacancy_pct',
        'bad_debt_pct',
        'concession_cost_pct',
        'turnover_vacancy_days'
      ]
    },
    {
      id: 'vacancy_market',
      label: 'Market Vacancy Context',
      tier: 'pro',
      collapsible: true,
      fields: [
        'market_vacancy_rate_pct',
        'submarket_vacancy_rate_pct',
        'competitive_set_vacancy_pct'
      ]
    }
  ],

  fields: [
    // RENT BASICS - NAPKIN TIER
    {
      key: 'current_rent_psf',
      label: 'Current Rent',
      type: 'currency',
      tier: 'napkin',
      required: true,
      format: { prefix: '$', decimals: 2 },
      helpText: {
        napkin: "What rent are you collecting today? This is your average rent per square foot per month.",
        mid: "Current in-place rent PSF per month. Use weighted average across all occupied units.",
        pro: "Weighted average in-place rent PSF per month across occupied units. Should reconcile to current T-12 rent roll."
      }
    },
    {
      key: 'occupancy_pct',
      label: 'Current Occupancy',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "How full is the building today? 95% means 95% of units are occupied.",
        mid: "Current physical occupancy rate (% of units occupied). Economic occupancy may differ if units are occupied but not paying.",
        pro: "Physical occupancy rate as of acquisition date. Use most recent rent roll. Distinguish from economic occupancy (accounts for non-paying tenants)."
      }
    },
    {
      key: 'annual_rent_growth_pct',
      label: 'Rent Growth Rate',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 15 },
      helpText: {
        napkin: "How much will rents increase each year? 3% is typical for moderate markets.",
        mid: "Annual rent growth assumption (simple average). Apply to market rents at lease renewal/turnover.",
        pro: "Long-term annual rent growth assumption. Should align with submarket rent growth forecasts. Can vary by year (use mid-tier fields for custom growth)."
      }
    },

    // RENT DETAILS - MID TIER
    {
      key: 'in_place_rent_psf',
      label: 'In-Place Rent',
      type: 'currency',
      tier: 'mid',
      format: { prefix: '$', decimals: 2 },
      helpText: {
        napkin: "",
        mid: "Current rent being collected from existing tenants (PSF/month). May be below market if tenants have been in place for years.",
        pro: "Actual in-place rent PSF from current rent roll. Used to calculate rent loss-to-lease and mark-to-market opportunity."
      }
    },
    {
      key: 'market_rent_psf',
      label: 'Market Rent',
      type: 'currency',
      tier: 'mid',
      format: { prefix: '$', decimals: 2 },
      helpText: {
        napkin: "",
        mid: "What could you rent units for today in the current market? Compare recent leases and comps.",
        pro: "Current market rent PSF for comparable units. Use recent lease comps (90-day lookback). Adjust for concessions and lease structure."
      }
    },
    {
      key: 'rent_loss_to_lease_pct',
      label: 'Loss-to-Lease',
      type: 'percentage',
      tier: 'mid',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "How much below market are your current rents? 10% loss-to-lease means in-place rent is 90% of market.",
        pro: "Percentage difference between in-place and market rents. Positive = upside opportunity. Calculate as (Market - In-Place) / Market."
      }
    },
    {
      key: 'lease_up_months',
      label: 'Lease-Up Period',
      type: 'number',
      tier: 'mid',
      format: { suffix: ' months', decimals: 0 },
      validation: { min: 0, max: 60 },
      helpText: {
        napkin: "",
        mid: "How long to reach stabilized occupancy? 12 months is typical for value-add multifamily.",
        pro: "Months from acquisition to stabilized occupancy. Used for absorption curve modeling. Factor in renovation timeline and leasing velocity."
      }
    },
    {
      key: 'stabilized_occupancy_pct',
      label: 'Stabilized Occupancy',
      type: 'percentage',
      tier: 'mid',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 85, max: 100 },
      helpText: {
        napkin: "",
        mid: "What occupancy will you achieve once stabilized? 95-96% is typical for well-managed multifamily.",
        pro: "Target stabilized occupancy post-renovation/lease-up. Should align with submarket Class A/B comps. Account for frictional vacancy."
      }
    },
    {
      key: 'rent_growth_years_1_3_pct',
      label: 'Rent Growth (Years 1-3)',
      type: 'percentage',
      tier: 'mid',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Near-term rent growth during lease-up/stabilization period. Often higher than long-term growth.",
        pro: "Annual rent growth for Years 1-3. Use higher growth during value-add period capturing loss-to-lease. Revert to stabilized growth thereafter."
      }
    },
    {
      key: 'rent_growth_stabilized_pct',
      label: 'Rent Growth (Stabilized)',
      type: 'percentage',
      tier: 'mid',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Long-term rent growth after stabilization. Should align with inflation + population growth.",
        pro: "Long-term stabilized rent growth (Year 4+). Conservative assumption: 2-3% for most markets. Should not exceed wage growth + inflation."
      }
    },
    {
      key: 'free_rent_months',
      label: 'Free Rent Concession',
      type: 'number',
      tier: 'mid',
      format: { suffix: ' months', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Months of free rent offered as leasing concession. Reduces effective rent. 0.5-1 month typical in competitive markets.",
        pro: "Average free rent months per new lease. Amortize over lease term for effective rent calculation. Should phase out as market improves."
      }
    },
    {
      key: 'ti_allowance_per_unit',
      label: 'TI Allowance per Unit',
      type: 'currency',
      tier: 'mid',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Tenant improvement allowance per unit for new leases (paint, minor repairs). $1-3K typical for multifamily.",
        pro: "TI/make-ready cost per unit turn. Include paint, carpet/flooring, appliance repairs, cleaning. Recurring cost distinct from major CapEx."
      }
    },
    {
      key: 'renewal_probability_pct',
      label: 'Renewal Probability',
      type: 'percentage',
      tier: 'mid',
      format: { suffix: '%', decimals: 0 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "",
        mid: "What % of tenants renew their lease? 60% is typical multifamily. Higher renewals reduce turn costs.",
        pro: "Lease renewal probability (% of expiring leases that renew). Impacts turnover costs and vacancy timing. Use historical property data or submarket benchmarks."
      }
    },

    // OTHER INCOME - NAPKIN TIER
    {
      key: 'other_income_per_unit_monthly',
      label: 'Other Income per Unit',
      type: 'currency',
      tier: 'napkin',
      required: true,
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "How much extra monthly income per unit from parking, pets, laundry, etc.? $100-200 is typical.",
        mid: "Aggregate other income per unit per month. Includes parking, pets, laundry, fees, etc.",
        pro: "Total other income per unit per month (aggregate). For detailed breakdown, see itemized mid/pro fields below."
      }
    },

    // OTHER INCOME - MID TIER
    {
      key: 'parking_income_per_space',
      label: 'Parking Income per Space',
      type: 'currency',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Monthly income per parking space. $50-150 typical depending on market (urban vs suburban).",
        pro: "Average monthly parking income per space. Distinguish covered vs uncovered, reserved vs unreserved. Urban markets command premium."
      }
    },
    {
      key: 'parking_spaces',
      label: 'Parking Spaces',
      type: 'number',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Total parking spaces available to rent (exclude assigned spaces included in rent).",
        pro: "Total rentable parking spaces. Distinguish from parking ratio (spaces per unit). Not all spaces may generate income if included in rent."
      }
    },
    {
      key: 'pet_fee_per_pet',
      label: 'Pet Fee per Pet',
      type: 'currency',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Monthly pet rent per pet. $25-50 typical. May also have one-time pet deposit (non-recurring).",
        pro: "Monthly pet rent per pet (recurring). Separate from one-time pet deposit. Many properties charge per pet (2 pet max common)."
      }
    },
    {
      key: 'pet_penetration_pct',
      label: 'Pet Penetration',
      type: 'percentage',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { suffix: '%', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "What % of tenants have pets? 30-40% typical. Varies by property type and pet policy.",
        pro: "Percentage of units with pets. Used to calculate pet income (units × penetration % × fee per pet). Track by property policy (dogs only, etc.)."
      }
    },
    {
      key: 'laundry_income_per_unit',
      label: 'Laundry Income per Unit',
      type: 'currency',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Monthly laundry income per unit. $10-25 typical for coin-op or card systems.",
        pro: "Average monthly laundry income per unit. Varies by in-unit vs shared laundry. May be revenue-share with vendor (typical: 50/50 split)."
      }
    },
    {
      key: 'storage_income_per_unit',
      label: 'Storage Income per Unit',
      type: 'currency',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Monthly storage locker income per unit. $10-30 typical. Not all units rent storage.",
        pro: "Average storage income per unit per month. Multiply by penetration rate (% of units renting storage) for total storage income."
      }
    },
    {
      key: 'application_fees_annual',
      label: 'Application Fees (Annual)',
      type: 'currency',
      tier: 'mid',
      group: 'other_income_itemized',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Annual income from application/screening fees. Calculate as units × turnover % × fee ($50-75 typical).",
        pro: "Total annual application fee income. Fee per application ($50-75) × # applications. High turnover = higher fee income."
      }
    },

    // OTHER INCOME - PRO TIER
    {
      key: 'late_fees_annual',
      label: 'Late Fees',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Annual late fee income. Typical: $50-100 per late payment. Depends on payment discipline and enforcement. May offset by bad debt."
      }
    },
    {
      key: 'utility_reimbursements_annual',
      label: 'Utility Reimbursements',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Annual utility reimbursements from tenants (RUBS - Ratio Utility Billing System). For properties where owner pays utilities but bills back tenants."
      }
    },
    {
      key: 'furnished_unit_premium_pct',
      label: 'Furnished Unit Premium',
      type: 'percentage',
      tier: 'pro',
      group: 'other_income_pro',
      format: { suffix: '%', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Rent premium for furnished units (% above base rent). 15-25% typical. Apply to units designated as furnished."
      }
    },
    {
      key: 'short_term_rental_income',
      label: 'Short-Term Rental Income',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Annual income from short-term rentals (30-90 day leases). Commands premium but higher turnover costs. Check local STR regulations."
      }
    },
    {
      key: 'ancillary_services_income',
      label: 'Ancillary Services',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Income from additional services: cable/internet packages, renters insurance, furniture rental, etc. Often revenue-share arrangements."
      }
    },
    {
      key: 'vending_income',
      label: 'Vending Income',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Monthly income from vending machines (snacks, beverages). Typically revenue-share with vendor."
      }
    },
    {
      key: 'package_locker_fees',
      label: 'Package Locker Fees',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Monthly fee for package locker/concierge service. May be flat fee per unit or percentage of rent."
      }
    },
    {
      key: 'reserved_parking_premium',
      label: 'Reserved Parking Premium',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Additional monthly fee for reserved/covered parking above standard parking rate."
      }
    },
    {
      key: 'ev_charging_fees',
      label: 'EV Charging Fees',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Monthly income from EV charging stations. May be usage-based or flat fee. Growing amenity in new construction."
      }
    },
    {
      key: 'other_miscellaneous',
      label: 'Other Miscellaneous',
      type: 'currency',
      tier: 'pro',
      group: 'other_income_pro',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Catchall for other income not categorized above: lease termination fees, NSF fees, admin fees, etc."
      }
    },

    // VACANCY - NAPKIN TIER
    {
      key: 'vacancy_loss_pct',
      label: 'Vacancy Loss',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 25 },
      helpText: {
        napkin: "What % of potential rent will you lose to vacant units? 5% is typical (95% occupancy).",
        mid: "Physical vacancy loss as % of gross potential rent. 5% = 95% average occupancy. Stabilized assumption.",
        pro: "Physical vacancy rate (% of gross potential rent lost to unoccupied units). Distinguish from economic vacancy (occupied but not paying)."
      }
    },
    {
      key: 'collection_loss_pct',
      label: 'Collection Loss',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 10 },
      helpText: {
        napkin: "What % of rent won't you collect due to bad debt? 2% is typical.",
        mid: "Bad debt / credit loss as % of scheduled rent. Includes non-paying tenants, evictions, unpaid balances.",
        pro: "Credit loss as % of scheduled rent. Represents economic vacancy (occupied units not paying). Track via rent collections ÷ rent receivable."
      }
    },

    // VACANCY - MID TIER
    {
      key: 'physical_vacancy_pct',
      label: 'Physical Vacancy',
      type: 'percentage',
      tier: 'mid',
      group: 'vacancy_details',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Vacancy from unoccupied units. Includes turnover time between leases.",
        pro: "Physical vacancy rate (% of units unoccupied). Includes frictional vacancy between leases. Calculate: vacant units / total units."
      }
    },
    {
      key: 'economic_vacancy_pct',
      label: 'Economic Vacancy',
      type: 'percentage',
      tier: 'mid',
      group: 'vacancy_details',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Vacancy from occupied units not paying rent (evictions, skip-outs).",
        pro: "Economic vacancy from non-paying occupied units. Separate from bad debt expense (after-fact charge-offs). Represents in-process evictions."
      }
    },
    {
      key: 'bad_debt_pct',
      label: 'Bad Debt',
      type: 'percentage',
      tier: 'mid',
      group: 'vacancy_details',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Uncollectible rent written off. Typical: 1-2% of scheduled rent.",
        pro: "Bad debt expense as % of scheduled rent. Historical charge-offs. Varies by market, rent level, screening quality."
      }
    },
    {
      key: 'concession_cost_pct',
      label: 'Concession Cost',
      type: 'percentage',
      tier: 'mid',
      group: 'vacancy_details',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "Cost of rent concessions as % of gross rent (free rent, discounts).",
        pro: "Concession cost as % of gross potential rent. Represents economic cost of free rent, discounts amortized over lease term."
      }
    },
    {
      key: 'turnover_vacancy_days',
      label: 'Turnover Vacancy Days',
      type: 'number',
      tier: 'mid',
      group: 'vacancy_details',
      format: { suffix: ' days', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "Average days vacant between tenants. 14-21 days typical for well-managed multifamily.",
        pro: "Average turnover days (moveout to new lease start). Includes make-ready time, marketing, application processing. Minimize to improve NOI."
      }
    },

    // VACANCY - PRO TIER
    {
      key: 'market_vacancy_rate_pct',
      label: 'Market Vacancy Rate',
      type: 'percentage',
      tier: 'pro',
      group: 'vacancy_market',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Overall market vacancy rate (entire metro area). Context for submarket and property assumptions. Source: CoStar, local apartment associations."
      }
    },
    {
      key: 'submarket_vacancy_rate_pct',
      label: 'Submarket Vacancy Rate',
      type: 'percentage',
      tier: 'pro',
      group: 'vacancy_market',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Submarket vacancy rate (property's immediate competitive area). More relevant than metro-wide rate. Validate property assumptions against submarket."
      }
    },
    {
      key: 'competitive_set_vacancy_pct',
      label: 'Competitive Set Vacancy',
      type: 'percentage',
      tier: 'pro',
      group: 'vacancy_market',
      format: { suffix: '%', decimals: 1 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Vacancy rate for 5-10 directly comparable properties (similar age, size, amenities). Best benchmark for property-specific assumptions."
      }
    }
  ]
};
