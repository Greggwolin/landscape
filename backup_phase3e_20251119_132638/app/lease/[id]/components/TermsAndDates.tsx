'use client';

import type { LeaseData, LeaseValidationErrors } from '../../types';

interface TermsAndDatesProps {
  data: LeaseData;
  errors: LeaseValidationErrors;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const TermsAndDates: React.FC<TermsAndDatesProps> = ({ data, errors, onUpdate }) => {
  return (
    <div className="tab-section">
      <div className="section-title">Terms & Dates</div>
      <div className="section-subtitle">Lease term, important dates, and renewal options</div>

      <div className="form-grid form-grid-3" style={{ marginTop: 20 }}>
        <div className="lease-card" style={{ padding: 20, boxShadow: 'none', border: '1px solid #e5e7eb', marginBottom: 0 }}>
          <div className="subsection-title">Key Dates</div>
          <div className="form-group">
            <label className="form-label">Lease Commencement</label>
            <input
              type="date"
              className="form-control"
              value={data.lease.lease_commencement_date ?? ''}
              onChange={(event) => onUpdate('lease', 'lease_commencement_date', event.target.value)}
            />
            {errors.lease_commencement_date ? (
              <span className="helper-text" style={{ color: 'var(--danger)' }}>{errors.lease_commencement_date}</span>
            ) : null}
          </div>
          <div className="form-group">
            <label className="form-label">Rent Start</label>
            <input
              type="date"
              className="form-control"
              value={data.lease.rent_start_date ?? ''}
              onChange={(event) => onUpdate('lease', 'rent_start_date', event.target.value)}
            />
            {errors.rent_start_date ? <span className="helper-text" style={{ color: 'var(--danger)' }}>{errors.rent_start_date}</span> : null}
          </div>
          <div className="form-group">
            <label className="form-label">Lease Expiration</label>
            <input
              type="date"
              className="form-control"
              value={data.lease.lease_expiration_date ?? ''}
              onChange={(event) => onUpdate('lease', 'lease_expiration_date', event.target.value)}
            />
            {errors.lease_expiration_date ? (
              <span className="helper-text" style={{ color: 'var(--danger)' }}>{errors.lease_expiration_date}</span>
            ) : null}
          </div>
        </div>

        <div className="lease-card" style={{ padding: 20, boxShadow: 'none', border: '1px solid #e5e7eb', marginBottom: 0 }}>
          <div className="subsection-title">Term Length</div>
          <div className="form-group">
            <label className="form-label">Initial Term</label>
            <div className="input-group">
              <input
                type="number"
                value={data.lease.lease_term_months}
                onChange={(event) => onUpdate('lease', 'lease_term_months', Number(event.target.value))}
              />
              <span className="input-addon">Months</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Floor Number</label>
            <input
              type="number"
              className="form-control"
              value={data.lease.floor_number ?? ''}
              onChange={(event) => onUpdate('lease', 'floor_number', Number(event.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Security Deposit</label>
            <div className="input-group">
              <input
                type="number"
                value={data.lease.security_deposit_amount ?? 0}
                onChange={(event) => onUpdate('lease', 'security_deposit_amount', Number(event.target.value))}
              />
              <span className="input-addon">USD</span>
            </div>
          </div>
        </div>

        <div className="lease-card" style={{ padding: 20, boxShadow: 'none', border: '1px solid #e5e7eb', marginBottom: 0 }}>
          <div className="subsection-title">Renewal Options</div>
          <div className="form-group">
            <label className="form-label">Number of Options</label>
            <input
              type="number"
              className="form-control"
              value={data.lease.number_of_renewal_options}
              onChange={(event) => onUpdate('lease', 'number_of_renewal_options', Number(event.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Option Term</label>
            <div className="input-group">
              <input
                type="number"
                value={data.lease.renewal_option_term_months ?? 0}
                onChange={(event) => onUpdate('lease', 'renewal_option_term_months', Number(event.target.value))}
              />
              <span className="input-addon">Months</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Renewal Probability</label>
            <div className="input-group">
              <input
                type="number"
                value={data.lease.renewal_probability_pct ?? 0}
                onChange={(event) => onUpdate('lease', 'renewal_probability_pct', Number(event.target.value))}
              />
              <span className="input-addon">%</span>
            </div>
            {errors.renewal_probability_pct ? (
              <span className="helper-text" style={{ color: 'var(--danger)' }}>{errors.renewal_probability_pct}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndDates;
