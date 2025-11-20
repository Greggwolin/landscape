'use client';

import type { LeaseData } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/format';

interface LeasingCostsProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const LeasingCosts: React.FC<LeasingCostsProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-section" id="leasing-costs">
      <div className="section-title">Leasing Costs</div>
      <div className="section-subtitle">Tenant improvements, commissions, and deposits</div>

      <div className="card-grid card-grid-3" style={{ marginTop: 20 }}>
        <div className="info-card">
          <h3 className="card-title">Tenant Improvements</h3>
          <div className="form-group">
            <label className="form-label">Allowance ($/SF)</label>
            <div className="input-group">
              <input
                type="number"
                value={data.improvements.allowance_psf}
                onChange={(event) =>
                  onUpdate('improvements', 'allowance_psf', Number(event.target.value))
                }
              />
              <span className="input-addon">$/SF</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Allowance Total</label>
            <div className="input-group">
              <input
                type="number"
                value={data.improvements.allowance_total}
                onChange={(event) =>
                  onUpdate('improvements', 'allowance_total', Number(event.target.value))
                }
              />
              <span className="input-addon">USD</span>
            </div>
          </div>
          <div className="form-control" style={{ background: 'var(--gray-100)' }}>
            {formatCurrency(data.improvements.allowance_total)} total TI spend
          </div>
        </div>

        <div className="info-card">
          <h3 className="card-title">Commissions</h3>
          <div className="form-group">
            <label className="form-label">Base Commission</label>
            <div className="input-group">
              <input
                type="number"
                value={data.commissions.base_commission_pct}
                onChange={(event) =>
                  onUpdate('commissions', 'base_commission_pct', Number(event.target.value))
                }
              />
              <span className="input-addon">%</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Renewal Commission</label>
            <div className="input-group">
              <input
                type="number"
                value={data.commissions.renewal_commission_pct ?? 0}
                onChange={(event) =>
                  onUpdate('commissions', 'renewal_commission_pct', Number(event.target.value))
                }
              />
              <span className="input-addon">%</span>
            </div>
          </div>
          <div className="helper-text">
            Base commission {formatPercentage(data.commissions.base_commission_pct)} of total consideration
          </div>
        </div>

        <div className="info-card">
          <h3 className="card-title">Deposits & Guarantees</h3>
          <div className="form-group">
            <label className="form-label">Security Deposit</label>
            <div className="input-group">
              <input
                type="number"
                value={data.lease.security_deposit_amount ?? 0}
                onChange={(event) =>
                  onUpdate('lease', 'security_deposit_amount', Number(event.target.value))
                }
              />
              <span className="input-addon">USD</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Months Held</label>
            <div className="input-group">
              <input
                type="number"
                value={data.lease.security_deposit_months ?? 0}
                onChange={(event) =>
                  onUpdate('lease', 'security_deposit_months', Number(event.target.value))
                }
              />
              <span className="input-addon">Months</span>
            </div>
          </div>
          <div className="helper-text">Typical range: 1-3 months depending on credit strength</div>
        </div>
      </div>
    </div>
  );
};

export default LeasingCosts;
