/**
 * Timing & Escalation Field Validation
 *
 * Validates budget line item timing and escalation fields
 */

export interface ValidationErrors {
  start_date?: string;
  end_date?: string;
  timing_method?: string;
  curve_profile?: string;
  curve_steepness?: string;
  escalation_rate?: string;
  escalation_method?: string;
}

export interface ValidationResult {
  errors: ValidationErrors;
  isValid: boolean;
}

/**
 * Validate timing and escalation fields for a budget line item
 *
 * @param fields - Partial budget item with timing/escalation fields
 * @returns Validation result with specific error messages
 */
export function validateTimingFields(fields: {
  start_date?: string | null;
  end_date?: string | null;
  timing_method?: string | null;
  curve_profile?: string | null;
  curve_steepness?: number | null;
  escalation_rate?: number | null;
  escalation_method?: string | null;
}): ValidationResult {
  const errors: ValidationErrors = {};

  // Date validation
  if (fields.start_date && fields.end_date) {
    const startDate = new Date(fields.start_date);
    const endDate = new Date(fields.end_date);

    if (endDate <= startDate) {
      errors.end_date = 'End date must be after start date';
    }

    // Check for dates in far future (likely data entry error)
    const now = new Date();
    const maxDate = new Date(now.getFullYear() + 20, 11, 31);
    if (startDate > maxDate) {
      errors.start_date = 'Start date seems unusually far in the future';
    }
    if (endDate > maxDate) {
      errors.end_date = 'End date seems unusually far in the future';
    }
  }

  // Distribution method validation
  if (fields.timing_method === 'curve') {
    if (!fields.curve_profile) {
      errors.curve_profile = 'Curve profile required for S-Curve distribution';
    }

    if (
      fields.curve_steepness !== null &&
      fields.curve_steepness !== undefined &&
      (fields.curve_steepness < 0 || fields.curve_steepness > 100)
    ) {
      errors.curve_steepness = 'Curve steepness must be between 0 and 100';
    }
  }

  // Escalation validation
  if (fields.escalation_rate !== null && fields.escalation_rate !== undefined) {
    if (fields.escalation_rate < -50) {
      errors.escalation_rate = 'Escalation rate cannot be less than -50% (deflation limit)';
    }
    if (fields.escalation_rate > 50) {
      errors.escalation_rate = 'Escalation rate cannot exceed 50% (hyperinflation cap)';
    }

    // If escalation rate is set, method should be specified
    if (fields.escalation_rate !== 0 && !fields.escalation_method) {
      errors.escalation_method = 'Escalation method required when rate is specified';
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Check if required timing fields are present for Standard mode
 */
export function hasRequiredTimingFields(fields: {
  start_date?: string | null;
  end_date?: string | null;
}): boolean {
  return Boolean(fields.start_date && fields.end_date);
}

/**
 * Get user-friendly validation message
 */
export function getValidationMessage(errors: ValidationErrors): string {
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) {
    return '';
  }
  return messages.join('; ');
}
