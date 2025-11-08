/**
 * Format number utility functions
 * App-wide rule: Display "-" instead of 0 for all numeric values
 */

/**
 * Format a number to a locale string, showing "-" for 0 or null/undefined
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return '—';
  }
  return value.toLocaleString();
}

/**
 * Format a currency value, showing "-" for 0 or null/undefined
 */
export function formatCurrency(value: number | null | undefined, showCents: boolean = false): string {
  if (value === null || value === undefined || value === 0) {
    return '—';
  }
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  });
  return `$${formatted}`;
}

/**
 * Format a decimal value with fixed precision, showing "-" for 0 or null/undefined
 */
export function formatDecimal(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || value === 0) {
    return '—';
  }
  return value.toFixed(decimals);
}

/**
 * Format a percentage, showing "-" for 0 or null/undefined
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || value === 0) {
    return '—';
  }
  return `${value.toFixed(decimals)}%`;
}
