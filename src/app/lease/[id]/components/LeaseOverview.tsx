'use client';

import MetricsGrid from '../../components/MetricsGrid';
import ToggleSwitch from '../../components/ToggleSwitch';
import type { LeaseData, LeaseValidationErrors } from '../../types';
import { formatCurrency } from '../../utils/format';

interface LeaseOverviewProps {
  data: LeaseData;
  errors: LeaseValidationErrors;
  onUpdate: (field: string, value: unknown) => void;
}

const LeaseOverview: React.FC<LeaseOverviewProps> = ({ data, errors, onUpdate }) => {
  const metrics = [
    {
      label: 'Annual Base Rent',
      value: formatCurrency(data.metrics.annual_base_rent),
      isCurrency: true
    },
    {
      label: 'Rent / SF',
      value: formatCurrency(data.metrics.rent_per_sf, { maximumFractionDigits: 2 }),
      subtext: 'Annualized'
    },
    {
      label: 'Free Rent',
      value: `${data.metrics.free_rent_months} months`
    },
    {
      label: 'WALT',
      value: `${data.metrics.walt_months} months`
    }
  ];

  return (
    <div className="tab-section">
      <div className="section-title-row">
        <div>
          <div className="section-title">Lease Information</div>
          <div className="section-subtitle">Tenant summary, status, and key metrics</div>
        </div>
      </div>

      <MetricsGrid metrics={metrics} />

      <div className="form-grid form-grid-2" style={{ marginTop: 24 }}>
        <div className="lease-card" style={{ padding: 20, boxShadow: 'none', border: '1px solid #e5e7eb', marginBottom: 0 }}>
          <div className="section-title" style={{ fontSize: 13, textTransform: 'uppercase', color: '#6b7280', marginBottom: 16 }}>
            Tenant Information
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Tenant Name</label>
              <input
                className="form-control"
                value={data.lease.tenant_name}
                onChange={(event) => onUpdate('tenant_name', event.target.value)}
              />
              {errors.tenant_name ? <span className="helper-text" style={{ color: 'var(--danger)' }}>{errors.tenant_name}</span> : null}
            </div>
            <div className="form-group">
              <label className="form-label">Classification</label>
              <input
                className="form-control"
                value={data.lease.tenant_classification ?? ''}
                placeholder="Anchor, Junior Anchor, Inline Retail…"
                onChange={(event) => onUpdate('tenant_classification', event.target.value)}
              />
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Primary Contact</label>
              <input
                className="form-control"
                value={data.lease.tenant_contact ?? ''}
                onChange={(event) => onUpdate('tenant_contact', event.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                className="form-control"
                value={data.lease.tenant_email ?? ''}
                onChange={(event) => onUpdate('tenant_email', event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="lease-card" style={{ padding: 20, boxShadow: 'none', border: '1px solid #e5e7eb', marginBottom: 0 }}>
          <div className="section-title" style={{ fontSize: 13, textTransform: 'uppercase', color: '#6b7280', marginBottom: 16 }}>
            Lease Attributes
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Lease Status</label>
              <select
                className="form-select"
                value={data.lease.lease_status}
                onChange={(event) => onUpdate('lease_status', event.target.value)}
              >
                <option value="Contract">Contract</option>
                <option value="Speculative">Speculative</option>
                <option value="Month-to-Month">Month-to-Month</option>
                <option value="Holdover">Holdover</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lease Type</label>
              <select
                className="form-select"
                value={data.lease.lease_type}
                onChange={(event) => onUpdate('lease_type', event.target.value)}
              >
                <option value="Office">Office</option>
                <option value="Retail">Retail</option>
                <option value="Industrial">Industrial</option>
                <option value="Mixed Use">Mixed Use</option>
              </select>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Suite Number</label>
              <input
                className="form-control"
                value={data.lease.suite_number ?? ''}
                onChange={(event) => onUpdate('suite_number', event.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Leased SF</label>
              <input
                type="number"
                className="form-control"
                value={data.lease.leased_sf}
                onChange={(event) => onUpdate('leased_sf', Number(event.target.value))}
              />
              {errors.leased_sf ? (
                <span className="helper-text" style={{ color: 'var(--danger)' }}>{errors.leased_sf}</span>
              ) : null}
            </div>
          </div>

          <div className="form-grid">
            <ToggleSwitch
              checked={data.lease.affects_occupancy}
              onChange={(checked) => onUpdate('affects_occupancy', checked)}
              label="Affects Occupancy"
              helperText="Include in occupancy calculations"
            />
            <ToggleSwitch
              checked={data.lease.expansion_rights}
              onChange={(checked) => onUpdate('expansion_rights', checked)}
              label="Expansion Rights"
            />
            <ToggleSwitch
              checked={data.lease.right_of_first_refusal}
              onChange={(checked) => onUpdate('right_of_first_refusal', checked)}
              label="Right of First Refusal"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaseOverview;
