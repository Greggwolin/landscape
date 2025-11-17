/**
 * Sales Validation Utilities
 * Frontend validation for sale events and closings
 */

/**
 * Validate that total closing units don't exceed parcel total
 */
export function validateClosingUnits(
  closings: { units_closing: number }[],
  totalUnits: number
): { valid: boolean; error?: string } {
  const totalClosing = closings.reduce((sum, c) => sum + (c.units_closing || 0), 0);

  if (totalClosing > totalUnits) {
    return {
      valid: false,
      error: `Total units closing (${totalClosing}) exceeds parcel total (${totalUnits})`,
    };
  }

  return { valid: true };
}

/**
 * Validate that closing dates are in chronological order
 */
export function validateClosingDates(
  closings: { closing_date: string | Date }[]
): { valid: boolean; error?: string; closingNumber?: number } {
  if (closings.length < 2) {
    return { valid: true };
  }

  const dates: { num: number; date: Date }[] = [];

  for (let i = 0; i < closings.length; i++) {
    const closingDate = closings[i].closing_date;
    if (!closingDate) {
      continue;
    }

    const date =
      typeof closingDate === 'string' ? new Date(closingDate + 'T00:00:00') : closingDate;

    dates.push({ num: i + 1, date });
  }

  // Check chronological order
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const curr = dates[i];

    if (curr.date < prev.date) {
      return {
        valid: false,
        error: `Closing ${curr.num} date must be after Closing ${prev.num} date`,
        closingNumber: curr.num,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate sale date is not empty
 */
export function validateSaleDate(saleDate: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!saleDate || saleDate.trim() === '') {
    return {
      valid: false,
      error: 'Sale date is required',
    };
  }

  return { valid: true };
}
