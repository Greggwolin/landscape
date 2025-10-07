import type { Lease, LeaseValidationErrors } from '../types';

export const validateLease = (data: Partial<Lease>): LeaseValidationErrors => {
  const errors: LeaseValidationErrors = {};

  if (data.lease_commencement_date && data.lease_expiration_date) {
    if (new Date(data.lease_commencement_date) >= new Date(data.lease_expiration_date)) {
      errors.lease_expiration_date = 'Expiration must be after commencement';
    }
  }

  if (data.rent_start_date && data.lease_commencement_date) {
    if (new Date(data.rent_start_date) < new Date(data.lease_commencement_date)) {
      errors.rent_start_date = 'Rent start must be on or after commencement';
    }
  }

  if (data.renewal_probability_pct !== undefined) {
    if (data.renewal_probability_pct < 0 || data.renewal_probability_pct > 100) {
      errors.renewal_probability_pct = 'Must be between 0 and 100';
    }
  }

  if (data.security_deposit_months !== undefined) {
    if (data.security_deposit_months < 0 || data.security_deposit_months > 12) {
      errors.security_deposit_months = 'Typically between 1-3 months';
    }
  }

  if (!data.tenant_name?.trim()) {
    errors.tenant_name = 'Tenant name is required';
  }

  if (!data.lease_commencement_date) {
    errors.lease_commencement_date = 'Commencement date is required';
  }

  if (!data.leased_sf || data.leased_sf <= 0) {
    errors.leased_sf = 'Leased area must be greater than 0';
  }

  return errors;
};
