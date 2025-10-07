'use client';

import type { BaseRent, LeaseData } from '../../types';
import { formatCurrency } from '../../utils/format';

interface RentStructureProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const RentStructure: React.FC<RentStructureProps> = ({ data, onUpdate }) => {
  const handleScheduleChange = (index: number, key: 'base_rent_psf_annual' | 'base_rent_annual' | 'base_rent_monthly') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = [...data.rentSchedule];
      next[index] = {
        ...next[index],
        [key]: Number(event.target.value)
      };
      onUpdate('rentSchedule', 'rentSchedule', next);
    };

  return (
    <div className="tab-section" id="rent">
      <div className="section-header">
        <h2 className="section-title">Rent Structure</h2>
        <p className="section-subtitle">Base rent calculations and schedule</p>
      </div>

      <div className="info-card">
        <h3 className="card-title">Calculation Method</h3>
        <div className="form-group">
          <label className="form-label">Rent Type</label>
          <select
            className="form-select"
            value={data.rentSchedule[0]?.rent_type ?? 'Fixed'}
            onChange={(event) => {
              const rentType = event.target.value as BaseRent['rent_type'];
              const next = data.rentSchedule.map((period) => ({
                ...period,
                rent_type: rentType
              }));
              onUpdate('rentSchedule', 'rentSchedule', next);
            }}
          >
            <option value="Fixed">Fixed</option>
            <option value="Free">Free Rent</option>
            <option value="Percentage">Percentage Rent</option>
            <option value="Market">Market</option>
          </select>
        </div>
      </div>

      <div className="info-card" style={{ marginTop: 24 }}>
        <h3 className="card-title">Rent Schedule</h3>
        <div className="card-grid">
          {data.rentSchedule.map((period, index) => (
            <div key={period.base_rent_id} className="info-card" style={{ background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Period {period.period_number}</div>
                <div className="helper-text">
                  {period.period_start_date} → {period.period_end_date}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Rent PSF (Annual)</label>
                <input
                  type="number"
                  className="form-control"
                  value={period.base_rent_psf_annual}
                  onChange={handleScheduleChange(index, 'base_rent_psf_annual')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Annual Rent</label>
                <input
                  type="number"
                  className="form-control"
                  value={period.base_rent_annual}
                  onChange={handleScheduleChange(index, 'base_rent_annual')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Rent</label>
                <input
                  type="number"
                  className="form-control"
                  value={period.base_rent_monthly}
                  onChange={handleScheduleChange(index, 'base_rent_monthly')}
                />
              </div>
              <div className="helper-text">Free Rent: {period.free_rent_months} months</div>
            </div>
          ))}
        </div>
      </div>

      <div className="info-card" style={{ marginTop: 24 }}>
        <h3 className="card-title">Calculated Amounts</h3>
        <div className="card-grid card-grid-3">
          <div className="form-group">
            <label className="form-label">Total Contract Value</label>
            <div className="form-control" style={{ background: 'var(--gray-100)' }}>
              {formatCurrency(
                data.rentSchedule.reduce((sum, period) => sum + period.base_rent_annual, 0)
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Average Rent / SF</label>
            <div className="form-control" style={{ background: 'var(--gray-100)' }}>
              {formatCurrency(data.metrics.rent_per_sf, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Free Rent Months</label>
            <div className="form-control" style={{ background: 'var(--gray-100)' }}>
              {data.metrics.free_rent_months}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentStructure;
