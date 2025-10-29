import { ComplexityTier } from '@/contexts/ComplexityModeContext';

export interface OpExField {
  key: string;
  label: string;
  tier: ComplexityTier;
  category?: string; // For grouping related fields
  inputType: 'currency' | 'percent' | 'rate';
  defaultValue?: number | null;
  defaultEscalation?: number;
  calculationType?: 'total' | 'per_unit' | 'per_sf' | 'percent_egi';
  benchmarks?: {
    perUnit?: { min: number; median: number; max: number };
    perSF?: { min: number; median: number; max: number };
    percentEGI?: { min: number; median: number; max: number };
  };
  helpText: {
    basic: string;
    standard: string;
    advanced: string;
  };
  required: boolean;
  parentField?: string; // For fields that break out from a parent
}

export const multifamilyOpExFields: OpExField[] = [

  // ============================================
  // BASIC TIER (6 categories - always visible)
  // ============================================

  {
    key: 'property_taxes',
    label: 'Property Taxes',
    tier: 'basic',
    category: 'taxes',
    inputType: 'currency',
    defaultEscalation: 0.020, // 2% annual
    calculationType: 'total',
    benchmarks: {
      perUnit: { min: 2800, median: 2939, max: 3200 },
      perSF: { min: 4.00, median: 4.20, max: 4.50 }
    },
    helpText: {
      basic: "Annual real estate taxes for the property. Typically 1-1.5% of property value.",
      standard: "Real estate tax assessment based on county assessed value and millage rate. Usually increases 2% annually.",
      advanced: "Ad valorem property taxes based on assessed value × effective tax rate. Consider appeals, exemptions, and reassessment upon sale. Phoenix: ~1.29% effective rate."
    },
    required: true
  },

  {
    key: 'insurance',
    label: 'Insurance',
    tier: 'basic',
    category: 'insurance',
    inputType: 'currency',
    defaultEscalation: 0.035, // 3.5% annual
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 350, median: 420, max: 550 },
      perSF: { min: 0.50, median: 0.67, max: 0.85 }
    },
    helpText: {
      basic: "Property and liability insurance. Typically $350-550 per unit annually.",
      standard: "Combined property, general liability, and other insurance premiums. Escalates 3-4% annually due to rising claims and premiums.",
      advanced: "Includes property insurance (replacement cost), general liability ($1-2M), umbrella coverage, loss of rents, and potentially flood/earthquake depending on location. Phoenix Class B: $385-470/unit typical."
    },
    required: true
  },

  {
    key: 'utilities_combined',
    label: 'Utilities',
    tier: 'basic',
    category: 'utilities',
    inputType: 'currency',
    defaultEscalation: 0.040, // 4% annual
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 900, median: 1043, max: 1300 },
      perSF: { min: 1.20, median: 1.49, max: 1.80 }
    },
    helpText: {
      basic: "Water, sewer, gas, and electric for common areas or owner-paid units. Often $900-1,300 per unit if owner-paid.",
      standard: "Utilities expense depends on tenant vs owner responsibility. Master-metered properties have higher costs. Consider RUBS (Ratio Utility Billing System) recovery.",
      advanced: "Separate water/sewer (often partially recoverable via RUBS) from gas/electric (common area vs tenant-paid). Phoenix: high cooling costs, low heating. Model seasonal variation."
    },
    required: true
  },

  {
    key: 'repairs_maintenance',
    label: 'Repairs & Maintenance',
    tier: 'basic',
    category: 'maintenance',
    inputType: 'currency',
    defaultEscalation: 0.030, // 3% annual
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 950, median: 1289, max: 1600 },
      perSF: { min: 1.30, median: 1.84, max: 2.40 }
    },
    helpText: {
      basic: "Ongoing repairs, unit turnover costs, and general maintenance. Typically $1,000-1,500 per unit annually.",
      standard: "Includes general repairs (plumbing, electrical, HVAC), unit turnover (paint, carpet, cleaning), and preventive maintenance. Higher for older properties or deferred maintenance.",
      advanced: "Break out general R&M, unit turnover, HVAC service contracts, plumbing, electrical, appliance replacement. Class B with deferred maintenance: $1,450-1,600/unit. Track vendor contracts separately."
    },
    required: true
  },

  {
    key: 'property_management',
    label: 'Property Management',
    tier: 'basic',
    category: 'management',
    inputType: 'percent',
    defaultValue: 0.030, // 3% of EGI
    defaultEscalation: 0.000, // Tied to revenue, not inflated
    calculationType: 'percent_egi',
    benchmarks: {
      percentEGI: { min: 0.025, median: 0.030, max: 0.040 }
    },
    helpText: {
      basic: "Management fee, typically 2.5-4% of Effective Gross Income (EGI).",
      standard: "Third-party management fee as percentage of collections. Does not escalate separately as it's tied to revenue growth. Includes off-site oversight, accounting, owner reporting.",
      advanced: "Distinguish off-site management (% of EGI) from on-site payroll (fixed cost per unit). Large portfolios may negotiate 2-2.5%, smaller properties 3.5-4%. Does NOT include leasing fees."
    },
    required: true
  },

  {
    key: 'other_operating',
    label: 'Other Operating Expenses',
    tier: 'basic',
    category: 'other',
    inputType: 'currency',
    defaultEscalation: 0.030, // 3% annual
    calculationType: 'per_sf',
    benchmarks: {
      perUnit: { min: 1200, median: 1453, max: 1800 },
      perSF: { min: 1.60, median: 2.08, max: 2.60 }
    },
    helpText: {
      basic: "All other operating costs: landscaping, trash, pest control, admin, etc. Typically $1,200-1,800 per unit.",
      standard: "Combined category for landscaping, trash removal, pest control, pool service, admin, marketing. In Standard mode, these break out into separate line items.",
      advanced: "This category is replaced by detailed line items in Advanced mode. Use only in Basic mode for simplified underwriting."
    },
    required: true
  },

  // ===================================================
  // STANDARD TIER (13 line items - breaks out detail)
  // ===================================================

  {
    key: 'water_sewer',
    label: 'Water & Sewer',
    tier: 'standard',
    category: 'utilities',
    parentField: 'utilities_combined',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 380, median: 422, max: 500 },
      perSF: { min: 0.50, median: 0.60, max: 0.75 }
    },
    helpText: {
      basic: "Water and sewer utility costs.",
      standard: "Water/sewer expense if owner-paid. Often partially recoverable via RUBS. Phoenix: higher than national average due to desert climate.",
      advanced: "Track water for irrigation separately from domestic water. Model RUBS recovery (typically 50-70% recoverable based on unit size or occupants). Phoenix: $35-45/unit/month typical."
    },
    required: false
  },

  {
    key: 'gas_electric',
    label: 'Gas & Electric',
    tier: 'standard',
    category: 'utilities',
    parentField: 'utilities_combined',
    inputType: 'currency',
    defaultEscalation: 0.040,
    calculationType: 'per_sf',
    benchmarks: {
      perUnit: { min: 520, median: 621, max: 800 },
      perSF: { min: 0.70, median: 0.89, max: 1.20 }
    },
    helpText: {
      basic: "Gas and electric costs for common areas or owner-paid units.",
      standard: "Typically for common areas only (hallways, pool, clubhouse, exterior lighting) if units are separately metered. Phoenix: high electric due to AC, low gas.",
      advanced: "Model seasonal peaks (July-September cooling). Consider LED retrofit ROI. Common areas: pool pump (continuous), clubhouse (business hours), exterior (dusk-dawn). Phoenix: $0.11-13/kWh."
    },
    required: false
  },

  {
    key: 'landscaping',
    label: 'Landscaping & Grounds',
    tier: 'standard',
    category: 'other',
    parentField: 'other_operating',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_sf',
    benchmarks: {
      perUnit: { min: 100, median: 149, max: 250 },
      perSF: { min: 0.15, median: 0.21, max: 0.35 }
    },
    helpText: {
      basic: "Landscaping maintenance and grounds upkeep.",
      standard: "Contract landscaping service including mowing, trimming, seasonal color, irrigation maintenance. Phoenix: xeriscaping reduces costs vs traditional landscaping.",
      advanced: "Separate landscape maintenance contract from irrigation repairs. Include tree trimming (annual), seasonal plantings (quarterly), and irrigation system maintenance. HOA may cover some costs in master-planned communities."
    },
    required: false
  },

  {
    key: 'trash_removal',
    label: 'Trash Removal',
    tier: 'standard',
    category: 'other',
    parentField: 'other_operating',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 280, median: 315, max: 380 },
      perSF: { min: 0.38, median: 0.45, max: 0.55 }
    },
    helpText: {
      basic: "Trash and recycling service.",
      standard: "Waste hauling contract including dumpster service and recycling. Frequency depends on unit count (2-3x weekly typical). Phoenix: $26-32/unit/month.",
      advanced: "Model dumpster count (typically 1 per 20-30 units), pickup frequency, and annual CPI increases per contract. Include bulk item removal and extra pickups during turnover season."
    },
    required: false
  },

  {
    key: 'pest_control',
    label: 'Pest Control',
    tier: 'standard',
    category: 'other',
    parentField: 'other_operating',
    inputType: 'currency',
    defaultEscalation: 0.020,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 40, median: 45, max: 60 },
      perSF: { min: 0.05, median: 0.06, max: 0.08 }
    },
    helpText: {
      basic: "Pest control service.",
      standard: "Monthly or quarterly pest control service. Phoenix: scorpions, roaches, occasional rodents. $3.50-5/unit/month typical.",
      advanced: "Interior vs exterior treatment frequency. Model seasonal increases (summer). Phoenix: exterior treatment monthly, interior quarterly or on-call. Include exclusion work for recurring issues."
    },
    required: false
  },

  {
    key: 'pool_amenity_service',
    label: 'Pool & Amenity Service',
    tier: 'standard',
    category: 'other',
    parentField: 'other_operating',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 100, median: 154, max: 250 },
      perSF: { min: 0.15, median: 0.22, max: 0.35 }
    },
    helpText: {
      basic: "Pool maintenance and amenity upkeep costs.",
      standard: "Pool service (weekly chemical balance, equipment maintenance), fitness center equipment maintenance, clubhouse cleaning. Not applicable if no amenities.",
      advanced: "Separate pool service contract ($200-400/month per pool) from fitness equipment maintenance ($1,500-3,000/year) and clubhouse utilities. Phoenix: year-round pool use increases costs."
    },
    required: false
  },

  {
    key: 'onsite_payroll',
    label: 'On-Site Payroll',
    tier: 'standard',
    category: 'management',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 500, median: 575, max: 700 },
      perSF: { min: 0.70, median: 0.82, max: 1.00 }
    },
    helpText: {
      basic: "Salaries for on-site staff (manager, leasing, maintenance).",
      standard: "On-site personnel: property manager, leasing agent(s), maintenance technician(s). Includes wages, payroll taxes, benefits. Varies by unit count: 40-unit property needs 1-2 staff, 200+ units needs 4-5.",
      advanced: "Break out by position: manager ($45-55K), leasing ($30-40K), maintenance ($35-45K), plus payroll burden (taxes, insurance, benefits ~30%). Model part-time vs full-time based on unit count thresholds."
    },
    required: false
  },

  {
    key: 'administrative',
    label: 'Administrative',
    tier: 'standard',
    category: 'other',
    parentField: 'other_operating',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_sf',
    benchmarks: {
      perUnit: { min: 80, median: 97, max: 150 },
      perSF: { min: 0.10, median: 0.14, max: 0.20 }
    },
    helpText: {
      basic: "Office supplies, phone, internet, and general administrative costs.",
      standard: "Office supplies, phone/internet for property office, bank fees, professional services (accounting, legal), licenses and permits, marketing materials.",
      advanced: "Line items: office supplies ($50-75/unit/year), phone/internet ($100-150/month), professional fees (accounting/legal as incurred), marketing ($500-1,500/unit/year turnover season)."
    },
    required: false
  },

  {
    key: 'marketing_advertising',
    label: 'Marketing & Advertising',
    tier: 'standard',
    category: 'other',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 100, median: 150, max: 300 },
      percentEGI: { min: 0.005, median: 0.010, max: 0.020 }
    },
    helpText: {
      basic: "Marketing and advertising to attract tenants.",
      standard: "Includes online listings (Apartments.com, Zillow), signage, promotional materials, move-in specials. Higher in lease-up or high-turnover periods.",
      advanced: "Model separately from leasing commissions. Digital marketing ($500-1,000/month), ILS feeds (included in management fee?), signage/banners, seasonal promotions. Higher for first year or value-add repositioning."
    },
    required: false
  },

  {
    key: 'unit_turnover',
    label: 'Unit Turnover',
    tier: 'standard',
    category: 'maintenance',
    parentField: 'repairs_maintenance',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 200, median: 295, max: 500 },
    },
    helpText: {
      basic: "Cost to prepare units for new tenants (paint, carpet, cleaning).",
      standard: "Make-ready costs per turn: paint ($200-400), carpet cleaning or replacement ($150-300), cleaning ($75-150), minor repairs ($100-300). Frequency: 30-50% annual turnover typical.",
      advanced: "Model as separate line item from general R&M. Cost per turn × expected turns per year. Phoenix: 35-45% turnover. Carpet replacement every 3-4 years, paint every turn or every other."
    },
    required: false
  },

  {
    key: 'reserves_capex',
    label: 'Replacement Reserves',
    tier: 'standard',
    category: 'other',
    inputType: 'currency',
    defaultEscalation: 0.000, // Fixed per unit
    calculationType: 'per_unit',
    benchmarks: {
      perUnit: { min: 200, median: 250, max: 400 }
    },
    helpText: {
      basic: "Annual reserve for major capital expenditures (roof, HVAC, parking lot, etc.).",
      standard: "CapEx reserve for major systems: roof ($225/unit reserve = $9K for 40 units/year), HVAC replacement, parking lot resurfacing, building paint/siding. Typical: $200-300/unit/year.",
      advanced: "May not be included in OpEx (sometimes shown below NOI line). Underwriting standard: $250/unit/year minimum. Lenders require reserves for properties >10 years old. Track separately: FF&E vs structural."
    },
    required: false
  },

  // ===================================================
  // ADVANCED TIER (20+ fields - full GL breakdown)
  // ===================================================

  {
    key: 'property_insurance',
    label: 'Property Insurance',
    tier: 'advanced',
    category: 'insurance',
    parentField: 'insurance',
    inputType: 'currency',
    defaultEscalation: 0.035,
    calculationType: 'per_unit',
    helpText: {
      basic: "Property insurance premium.",
      standard: "Property insurance covering building and improvements at replacement cost.",
      advanced: "Replacement cost coverage for building, improvements, and property-owned personal property. Includes wind/hail. Phoenix: no hurricane/flood premium, but consider monsoon damage. Quote annually, bind 30-60 days pre-renewal."
    },
    required: false
  },

  {
    key: 'liability_insurance',
    label: 'Liability Insurance',
    tier: 'advanced',
    category: 'insurance',
    parentField: 'insurance',
    inputType: 'currency',
    defaultEscalation: 0.035,
    calculationType: 'per_unit',
    helpText: {
      basic: "Liability insurance premium.",
      standard: "General liability insurance protecting against injury/property damage claims.",
      advanced: "GL coverage typically $1-2M per occurrence, $2-4M aggregate. Includes premises liability, products/completed operations. Consider umbrella policy for additional $5-10M coverage ($2,000-5,000/year)."
    },
    required: false
  },

  {
    key: 'flood_insurance',
    label: 'Flood Insurance',
    tier: 'advanced',
    category: 'insurance',
    parentField: 'insurance',
    inputType: 'currency',
    defaultEscalation: 0.040,
    calculationType: 'total',
    helpText: {
      basic: "Flood insurance if in flood zone.",
      standard: "Required by lenders if in FEMA flood zone. Phoenix: rarely applicable except near wash areas.",
      advanced: "NFIP or private flood insurance if Zone A/AE/VE. $500K coverage typical for commercial multifamily. Phoenix: most properties Zone X (no requirement), but lenders may require for washes/retention areas."
    },
    required: false
  },

  {
    key: 'general_repairs',
    label: 'General Repairs',
    tier: 'advanced',
    category: 'maintenance',
    parentField: 'repairs_maintenance',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    helpText: {
      basic: "General repair costs.",
      standard: "Day-to-day repairs and maintenance not covered by service contracts.",
      advanced: "General handyman work, minor plumbing, electrical, drywall repair, door/lock repairs, appliance service calls. Budget $700-900/unit/year for Class B. Higher for older properties or deferred maintenance."
    },
    required: false
  },

  {
    key: 'hvac_service',
    label: 'HVAC Service',
    tier: 'advanced',
    category: 'maintenance',
    parentField: 'repairs_maintenance',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_unit',
    helpText: {
      basic: "HVAC maintenance and repairs.",
      standard: "Heating and cooling system maintenance, repairs, and filter replacement.",
      advanced: "Preventive maintenance contract ($150-250/unit/year for biannual service) plus repairs as needed. Phoenix: AC-heavy usage, expect higher service costs. Unit replacement not in OpEx (CapEx reserve)."
    },
    required: false
  },

  {
    key: 'plumbing_service',
    label: 'Plumbing Service',
    tier: 'advanced',
    category: 'maintenance',
    parentField: 'repairs_maintenance',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    helpText: {
      basic: "Plumbing repairs and maintenance.",
      standard: "Plumbing repairs, fixture replacement, water heater service, line stoppages.",
      advanced: "Emergency calls, fixture repairs/replacement, water heater service, line clearing. Phoenix: hard water issues common (scale buildup). Budget $100-200/unit/year. Separate water heater replacement to CapEx."
    },
    required: false
  },

  {
    key: 'electrical_service',
    label: 'Electrical Service',
    tier: 'advanced',
    category: 'maintenance',
    parentField: 'repairs_maintenance',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_unit',
    helpText: {
      basic: "Electrical repairs and maintenance.",
      standard: "Electrical repairs, outlet/switch replacement, breaker issues, lighting maintenance.",
      advanced: "Service calls, outlet/switch/breaker replacement, common area lighting, parking lot lighting repairs. Budget $75-125/unit/year. Major electrical work (panel upgrades) is CapEx."
    },
    required: false
  },

  {
    key: 'appliance_replacement',
    label: 'Appliance Repairs & Replacement',
    tier: 'advanced',
    category: 'maintenance',
    parentField: 'repairs_maintenance',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    helpText: {
      basic: "Appliance repair and replacement costs.",
      standard: "Repair and replacement of unit appliances (refrigerator, stove, dishwasher, microwave).",
      advanced: "Service calls for repairs ($100-150/call) plus full replacement as needed. Typical lifespan: refrigerator 10-15 years, stove 15-20, dishwasher 7-12, microwave 5-8. Budget $100-150/unit/year."
    },
    required: false
  },

  {
    key: 'irrigation_maintenance',
    label: 'Irrigation Maintenance',
    tier: 'advanced',
    category: 'other',
    parentField: 'landscaping',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_sf',
    helpText: {
      basic: "Irrigation system maintenance.",
      standard: "Sprinkler system repairs, timer adjustments, line breaks, head replacements.",
      advanced: "Separate from landscape contract. Includes controller programming, valve repairs, head adjustments, line breaks. Phoenix: year-round irrigation for non-native plants. Budget $0.05-0.08/SF/year."
    },
    required: false
  },

  {
    key: 'snow_removal',
    label: 'Snow Removal',
    tier: 'advanced',
    category: 'other',
    parentField: 'landscaping',
    inputType: 'currency',
    defaultEscalation: 0.000,
    calculationType: 'total',
    helpText: {
      basic: "Snow and ice removal (if applicable).",
      standard: "Snow plowing, shoveling, ice melt application. Not applicable in Phoenix.",
      advanced: "Contract for snow removal and ice management. Per-event pricing or seasonal contract. Phoenix: N/A. Leave at $0 for desert markets."
    },
    required: false
  },

  {
    key: 'office_supplies',
    label: 'Office Supplies',
    tier: 'advanced',
    category: 'other',
    parentField: 'administrative',
    inputType: 'currency',
    defaultEscalation: 0.020,
    calculationType: 'per_unit',
    helpText: {
      basic: "Office supplies for property management office.",
      standard: "Paper, pens, forms, printer supplies, postage for on-site office.",
      advanced: "Property office supplies including lease forms, envelopes, printer supplies, postage. Budget $25-40/unit/year. Higher in first year or during lease-up."
    },
    required: false
  },

  {
    key: 'phone_internet',
    label: 'Phone & Internet',
    tier: 'advanced',
    category: 'other',
    parentField: 'administrative',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'total',
    helpText: {
      basic: "Phone and internet service for property office.",
      standard: "Business phone line, high-speed internet for property management office and resident WiFi (if provided).",
      advanced: "Office phone/internet ($100-200/month), plus resident amenity WiFi if provided ($500-1,500/month depending on bandwidth). VoIP systems reduce costs."
    },
    required: false
  },

  {
    key: 'professional_fees',
    label: 'Professional Fees',
    tier: 'advanced',
    category: 'other',
    parentField: 'administrative',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_unit',
    helpText: {
      basic: "Legal, accounting, and professional service fees.",
      standard: "Legal fees (evictions, lease reviews), accounting (audits, tax prep), consulting, engineering reports.",
      advanced: "Legal: evictions ($500-1,500 each), lease reviews ($150-300), general counsel (retainer). Accounting: tax prep ($1,500-5,000), audits ($3,000-10,000). Budget $50-100/unit/year."
    },
    required: false
  },

  {
    key: 'licenses_permits',
    label: 'Licenses & Permits',
    tier: 'advanced',
    category: 'other',
    parentField: 'administrative',
    inputType: 'currency',
    defaultEscalation: 0.020,
    calculationType: 'total',
    helpText: {
      basic: "Business licenses, permits, and fees.",
      standard: "Business licenses, rental permits, fire inspections, elevator permits, pool permits.",
      advanced: "City business license ($100-500/year), rental registration (varies by jurisdiction), annual fire/safety inspections ($200-1,000), elevator permits ($300-800/year), pool permits ($50-200/year). Phoenix: minimal requirements vs California."
    },
    required: false
  },

  {
    key: 'security_service',
    label: 'Security Service',
    tier: 'advanced',
    category: 'other',
    inputType: 'currency',
    defaultEscalation: 0.025,
    calculationType: 'per_unit',
    helpText: {
      basic: "Security patrol or monitoring service.",
      standard: "Security patrol service, alarm monitoring, access control system maintenance.",
      advanced: "Patrol service ($500-2,000/month depending on frequency), alarm/camera monitoring ($50-150/month), access control system (gate openers, key fobs) maintenance ($1,000-3,000/year). Not all properties require."
    },
    required: false
  },

  {
    key: 'management_fee_offsite',
    label: 'Off-Site Management Fee',
    tier: 'advanced',
    category: 'management',
    parentField: 'property_management',
    inputType: 'percent',
    defaultValue: 0.025,
    defaultEscalation: 0.000,
    calculationType: 'percent_egi',
    helpText: {
      basic: "Off-site management company fee.",
      standard: "Third-party property management company fee, distinct from on-site staff payroll.",
      advanced: "Management company fee (2.5-4% of EGI) covers: corporate oversight, accounting, owner reporting, vendor management, legal coordination. Does NOT include on-site staff (modeled separately). Self-managed properties: $0."
    },
    required: false
  },

  {
    key: 'leasing_commissions',
    label: 'Leasing Commissions',
    tier: 'advanced',
    category: 'other',
    inputType: 'currency',
    defaultEscalation: 0.030,
    calculationType: 'per_unit',
    helpText: {
      basic: "Commissions paid for new leases.",
      standard: "Leasing fees for new tenant acquisition, typically 50-100% of one month's rent per new lease.",
      advanced: "New lease commission (50-100% of first month rent) × expected new leases per year. If on-site staff handles leasing, may be $0. If using leasing agents: budget based on turnover rate × commission structure."
    },
    required: false
  }
];

// Field counts for mode toggle display
export const fieldCounts = {
  basic: multifamilyOpExFields.filter(f => f.tier === 'basic').length,
  standard: multifamilyOpExFields.filter(f => ['basic', 'standard'].includes(f.tier)).length,
  advanced: multifamilyOpExFields.length
};

// Helper function to get visible fields for a given mode
export function getVisibleFields(mode: ComplexityTier): OpExField[] {
  const tierOrder = { basic: 1, standard: 2, advanced: 3 };
  const currentTierLevel = tierOrder[mode];

  return multifamilyOpExFields.filter(field => {
    const fieldTierLevel = tierOrder[field.tier];
    return fieldTierLevel <= currentTierLevel;
  });
}

// Helper function to get field categories for grouping
export function getFieldCategories(mode: ComplexityTier): string[] {
  const visibleFields = getVisibleFields(mode);
  const categories = new Set(visibleFields.map(f => f.category || 'general'));
  return Array.from(categories);
}
