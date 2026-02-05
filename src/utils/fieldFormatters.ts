/**
 * Field formatting utilities for extraction review
 */

// Fields that should NOT have comma separators
const STRING_NUMBER_FIELDS = [
  'zip_code', 'zipcode', 'zip',
  'street_number', 'address_number',
  'unit_number', 'unit_num', 'unit',
  'phone', 'phone_number', 'fax',
  'apn', 'parcel_number',
];

// Currency fields
const CURRENCY_FIELDS = [
  'current_rent', 'market_rent', 'asking_rent',
  'monthly_rent', 'annual_rent', 'scheduled_rent',
  'price', 'asking_price', 'sale_price',
  'noi', 'egi', 'gpr', 'opex',
];

// Percentage fields
const PERCENT_FIELDS = [
  'occupancy', 'vacancy', 'cap_rate',
  'expense_ratio', 'ltv', 'interest_rate',
];

// Square footage fields
const SF_FIELDS = [
  'square_feet', 'sq_ft', 'sf', 'sqft',
  'rentable_sf', 'gross_sf', 'unit_sf',
];

const EMPTY_DISPLAY = '-';

/**
 * Format a date as MMM-YY (e.g., "Jan-25")
 */
export function formatDateMMM_YY(value: string | Date | null | undefined): string {
  if (!value) return EMPTY_DISPLAY;

  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return EMPTY_DISPLAY;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);

    return `${month}-${year}`;
  } catch {
    return String(value);
  }
}

/**
 * Format field value based on field name
 */
export function formatFieldValue(fieldName: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return EMPTY_DISPLAY;
  }

  const field = fieldName.toLowerCase();

  // Date fields
  if (
    field.includes('date') ||
    field.includes('lease_start') ||
    field.includes('lease_end') ||
    field.includes('move_in')
  ) {
    return formatDateMMM_YY(value as string | Date | null | undefined);
  }

  // String number fields (no commas)
  if (STRING_NUMBER_FIELDS.some((f) => field.includes(f))) {
    return String(value).replace(/,/g, '');
  }

  // Currency fields
  if (CURRENCY_FIELDS.some((f) => field.includes(f))) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Percentage fields
  if (PERCENT_FIELDS.some((f) => field.includes(f))) {
    let num = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(num)) return String(value);
    // Convert decimal to percentage if needed
    if (num > 0 && num < 1) num *= 100;
    return `${num.toFixed(1)}%`;
  }

  // SF fields
  if (SF_FIELDS.some((f) => field.includes(f))) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Default: return as string
  return String(value);
}

/**
 * Check if field should be right-aligned (numeric)
 */
export function isNumericField(fieldName: string): boolean {
  const field = fieldName.toLowerCase();
  return (
    CURRENCY_FIELDS.some((f) => field.includes(f)) ||
    PERCENT_FIELDS.some((f) => field.includes(f)) ||
    SF_FIELDS.some((f) => field.includes(f)) ||
    field.includes('count') ||
    field.includes('bedrooms') ||
    field.includes('bathrooms')
  );
}

/**
 * Get human-readable label for field name
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    unit_number: 'Unit',
    bedrooms: 'Beds',
    bathrooms: 'Baths',
    square_feet: 'SF',
    current_rent: 'Rent',
    market_rent: 'Market',
    lease_start: 'Start',
    lease_end: 'End',
    tenant_name: 'Tenant',
    occupancy_status: 'Status',
    move_in_date: 'Move In',
    unit_type: 'Type',
  };

  return labels[fieldName] || fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
