'use client';

import type { LeaseData } from '../../types';
import { formatCurrency } from '../../utils/format';

interface MarketAssumptionsProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const MarketAssumptions: React.FC<MarketAssumptionsProps> = ({ data, onUpdate }) => {
  const handleRowChange = (index: number, key: 'projected_rent_psf' | 'renewal_cost_psf' | 'turnover_cost_psf') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = [...data.marketAssumptions];
      next[index] = {
        ...next[index],
        [key]: Number(event.target.value)
      };
      onUpdate('marketAssumptions', 'marketAssumptions', next);
    };

  return (
    <div className="tab-section" id="market">
      <div className="section-title">Market Assumptions</div>
      <div className="section-subtitle">Market rent projections and replacement costs</div>

      <div className="info-card" style={{ marginTop: 20 }}>
        <h3 className="card-title">Projections</h3>
        <div className="card-grid card-grid-3">
          {data.marketAssumptions.map((assumption, index) => (
            <div key={assumption.year} className="info-card" style={{ background: 'white', marginBottom: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Year {assumption.year}</div>
              <div className="form-group">
                <label className="form-label">Projected Rent</label>
                <div className="input-group">
                  <input
                    type="number"
                    value={assumption.projected_rent_psf}
                    onChange={handleRowChange(index, 'projected_rent_psf')}
                  />
                  <span className="input-addon">$/SF</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Renewal Cost</label>
                <div className="input-group">
                  <input
                    type="number"
                    value={assumption.renewal_cost_psf}
                    onChange={handleRowChange(index, 'renewal_cost_psf')}
                  />
                  <span className="input-addon">$/SF</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Turnover Cost</label>
                <div className="input-group">
                  <input
                    type="number"
                    value={assumption.turnover_cost_psf}
                    onChange={handleRowChange(index, 'turnover_cost_psf')}
                  />
                  <span className="input-addon">$/SF</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="info-card" style={{ marginTop: 24 }}>
        <h3 className="card-title">Summary</h3>
        <div className="card-grid card-grid-2">
          <div className="form-control" style={{ background: 'var(--gray-100)' }}>
            Avg Market Rent:{' '}
            {formatCurrency(
              data.marketAssumptions.reduce((sum, row) => sum + row.projected_rent_psf, 0) /
                data.marketAssumptions.length,
              { maximumFractionDigits: 2 }
            )}
          </div>
          <div className="form-control" style={{ background: 'var(--gray-100)' }}>
            Avg Turnover Cost:{' '}
            {formatCurrency(
              data.marketAssumptions.reduce((sum, row) => sum + row.turnover_cost_psf, 0) /
                data.marketAssumptions.length,
              { maximumFractionDigits: 2 }
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketAssumptions;
