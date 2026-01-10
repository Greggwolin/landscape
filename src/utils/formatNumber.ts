/**
 * Format number utility functions
 * App-wide rule: Display "-" instead of 0 for all numeric values
 */

/**
 * Format a number to a locale string, showing "-" for 0, null, undefined, or NaN
 * Handles string inputs from PostgreSQL numeric columns (Neon driver returns strings)
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || num === 0 || !Number.isFinite(num)) {
    return '—';
  }
  return num.toLocaleString();
}

/**
 * Format a currency value, showing "-" for 0, null, undefined, or NaN
 * Always rounds to whole dollars unless showCents is true
 * Handles string inputs from PostgreSQL numeric columns (Neon driver returns strings)
 */
export function formatCurrency(value: number | string | null | undefined, showCents: boolean = false): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || num === 0 || !Number.isFinite(num)) {
    return '—';
  }
  // Round to whole dollars unless showing cents
  const roundedValue = showCents ? num : Math.round(num);
  const formatted = roundedValue.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  });
  return `$${formatted}`;
}

/**
 * Format a decimal value with fixed precision, showing "-" for 0, null, undefined, or NaN
 * Handles string inputs from PostgreSQL numeric columns (Neon driver returns strings)
 */
export function formatDecimal(value: number | string | null | undefined, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || num === 0 || !Number.isFinite(num)) {
    return '—';
  }
  return num.toFixed(decimals);
}

/**
 * Format a percentage, showing "-" for 0, null, undefined, or NaN
 * Handles string inputs from PostgreSQL numeric columns (Neon driver returns strings)
 */
export function formatPercent(value: number | string | null | undefined, decimals: number = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || num === 0 || !Number.isFinite(num)) {
    return '—';
  }
  return `${num.toFixed(decimals)}%`;
}
