export const formatCurrency = (value: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...options
  }).format(value);

export const formatPercentage = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
