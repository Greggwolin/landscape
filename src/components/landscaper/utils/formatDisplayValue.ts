/**
 * Format field values for display based on field type
 */

// Currency fields - show as $#,###
const CURRENCY_FIELDS = [
  'asking_price',
  'price_per_unit',
  'noi',
  'egi',
  'gpr',
  'current_gpr',
  'proforma_gpr',
  'opex_total',
  'capex_total',
  'opex_real_estate_taxes',
  'opex_insurance',
  'opex_utilities',
  'opex_management',
  'opex_payroll',
  'opex_repairs',
  'opex_marketing',
  'opex_administrative',
  'opex_contract_services',
  'opex_water_sewer',
  'opex_trash',
  'opex_pest_control',
  'opex_landscaping',
  'avg_rent',
  'market_rent',
  'effective_rent',
  'current_rent',
  'scheduled_rent',
  'loss_to_lease',
  'vacancy_loss',
  'bad_debt',
  'other_income',
  'laundry_income',
  'parking_income',
  'pet_income',
  'replacement_reserves',
  'debt_service',
  'cash_flow',
  'gross_potential_rent',
  'effective_gross_income',
  'net_operating_income',
  // Income/value fields (Issue 4 fix)
  'avg_hh_income',
  'median_hh_income',
  'household_income',
  'hh_income',
  'avg_home_value',
  'median_home_value',
  'home_value',
];

// Percentage fields - show as #.##%
const PERCENT_FIELDS = [
  'cap_rate',
  'occupancy_rate',
  'vacancy_rate',
  'expense_ratio',
  'rent_growth_pct',
  'expense_growth_pct',
  'ltv',
  'interest_rate',
  'economic_occupancy',
  'physical_occupancy',
  'collection_loss',
  'management_fee_pct',
  // Submarket fields (Issue 3 fix)
  'submarket_occupancy',
  'submarket_vacancy',
  'market_occupancy',
  'market_vacancy',
  'occupancy',
  'vacancy',
  // Additional percentage fields
  'bad_debt_pct',
  'physical_vacancy_pct',
  'rubs_recovery_pct',
  'loss_to_lease_pct',
  'rent_growth',
  'expense_growth',
];

// Integer fields - show as #,### (no decimals)
const INTEGER_FIELDS = [
  'total_units',
  'year_built',
  'parking_spaces',
  'building_sf',
  'lot_sf',
  'stories',
  'buildings_count',
  'unit_count',
  'avg_sf',
  'rentable_sf',
  'gross_sf',
  'land_area_sf',
  'avg_unit_sf',
];

// Per-SF fields - show as $#.##
const PER_SF_FIELDS = ['rent_psf', 'price_psf', 'price_per_sf', 'opex_psf', 'noi_psf'];

export const formatDisplayValue = (value: unknown, fieldKey: string): string => {
  if (value === null || value === undefined || value === '') return '—';

  const key = fieldKey.toLowerCase();

  // ISSUE 2 FIX: Remove surrounding quotes from string values
  let processedValue = value;
  if (typeof processedValue === 'string') {
    // Remove leading/trailing quotes (single or double)
    processedValue = processedValue.replace(/^["']|["']$/g, '').trim();
    // If the value became empty after removing quotes, return dash
    if (!processedValue) return '—';
  }

  // Try to parse string values that look like numbers
  let numValue: number | null = null;
  if (typeof processedValue === 'number') {
    numValue = processedValue;
  } else if (typeof processedValue === 'string') {
    // Remove currency symbols, commas, and % for parsing
    const cleaned = processedValue.replace(/[$,%]/g, '').replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      numValue = parsed;
    }
  }

  // Currency fields
  if (CURRENCY_FIELDS.some((f) => key.includes(f))) {
    if (numValue === null) return String(processedValue);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  }

  // Per-SF fields (currency with 2 decimals)
  if (PER_SF_FIELDS.some((f) => key.includes(f))) {
    if (numValue === null) return String(processedValue);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  }

  // Percentage fields
  if (PERCENT_FIELDS.some((f) => key.includes(f))) {
    if (numValue === null) return String(processedValue);
    // Convert decimal to percentage if needed (0.045 -> 4.5%)
    // Values like 0.96, 0.04, 0.035 should become 96%, 4%, 3.5%
    let pctValue = numValue;
    if (numValue > 0 && numValue <= 1) pctValue = numValue * 100;
    return `${pctValue.toFixed(2)}%`;
  }

  // Integer fields
  if (INTEGER_FIELDS.some((f) => key.includes(f))) {
    if (numValue === null) return String(processedValue);
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Math.round(numValue));
  }

  // Default numeric formatting
  if (numValue !== null) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(numValue);
  }

  // Return processed value (with quotes removed) for non-numeric strings
  return String(processedValue);
};

/**
 * Check if a field should be right-aligned (numeric)
 */
export const isNumericField = (fieldKey: string): boolean => {
  const key = fieldKey.toLowerCase();

  // Check known numeric field lists
  if (
    CURRENCY_FIELDS.some((f) => key.includes(f)) ||
    PERCENT_FIELDS.some((f) => key.includes(f)) ||
    INTEGER_FIELDS.some((f) => key.includes(f)) ||
    PER_SF_FIELDS.some((f) => key.includes(f))
  ) {
    return true;
  }

  // Additional patterns that indicate numeric fields
  const numericPatterns = [
    'price', 'cost', 'rent', 'income', 'value', 'amount', 'total',
    'count', 'units', 'sf', 'sqft', 'rate', 'pct', 'percent',
    'year', 'age', 'beds', 'baths', 'stories', 'floors',
    'population', 'density', 'ratio', 'growth',
  ];

  return numericPatterns.some((pattern) => key.includes(pattern));
};

/**
 * Calculated field formulas
 */
export const CALCULATED_FIELDS: Record<
  string,
  {
    formula: (deps: Record<string, number>) => number | null;
    dependencies: string[];
    label: string;
  }
> = {
  price_per_unit: {
    formula: (d) => (d.asking_price && d.total_units ? d.asking_price / d.total_units : null),
    dependencies: ['asking_price', 'total_units'],
    label: 'Asking Price / Total Units',
  },
  price_per_sf: {
    formula: (d) => (d.asking_price && d.building_sf ? d.asking_price / d.building_sf : null),
    dependencies: ['asking_price', 'building_sf'],
    label: 'Asking Price / Building SF',
  },
  noi: {
    formula: (d) => (d.egi !== undefined && d.opex_total !== undefined ? d.egi - d.opex_total : null),
    dependencies: ['egi', 'opex_total'],
    label: 'EGI - OpEx',
  },
  cap_rate: {
    formula: (d) => (d.noi && d.asking_price ? (d.noi / d.asking_price) * 100 : null),
    dependencies: ['noi', 'asking_price'],
    label: 'NOI / Price',
  },
  expense_ratio: {
    formula: (d) => (d.opex_total && d.egi ? (d.opex_total / d.egi) * 100 : null),
    dependencies: ['opex_total', 'egi'],
    label: 'OpEx / EGI',
  },
};

export const isCalculatedField = (fieldKey: string): boolean => {
  return fieldKey.toLowerCase() in CALCULATED_FIELDS;
};

export const computeCalculatedValue = (
  fieldKey: string,
  allExtractions: Record<string, number>
): number | null => {
  const config = CALCULATED_FIELDS[fieldKey.toLowerCase()];
  if (!config) return null;

  // Check all dependencies are available
  const deps: Record<string, number> = {};
  for (const dep of config.dependencies) {
    const value = allExtractions[dep];
    if (value === undefined || value === null || isNaN(Number(value))) {
      return null;
    }
    deps[dep] = Number(value);
  }

  return config.formula(deps);
};

/**
 * Get the formula description for a calculated field
 */
export const getCalculatedFieldLabel = (fieldKey: string): string | null => {
  const config = CALCULATED_FIELDS[fieldKey.toLowerCase()];
  return config?.label ?? null;
};
