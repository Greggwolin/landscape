'use client';

import type { LeaseData } from '../../types';
import { formatCurrency } from '../../utils/format';

interface AdditionalIncomeProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const AdditionalIncome: React.FC<AdditionalIncomeProps> = ({ data, onUpdate }) => {
  const handleIncomeChange = (index: number, key: 'label' | 'amount' | 'frequency') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const next = [...data.additionalIncome.other_income];
      next[index] = {
        ...next[index],
        [key]: key === 'amount' ? Number(event.target.value) : event.target.value
      };
      onUpdate('additionalIncome', 'other_income', next);
    };

  return (
    <div className="tab-section" id="income">
      <div className="section-title">Additional Income</div>
      <div className="section-subtitle">Parking revenue and other income streams</div>

      <div className="card-grid card-grid-2" style={{ marginTop: 20 }}>
        <div className="info-card">
          <h3 className="card-title">Parking Revenue</h3>
          <div className="form-group">
            <label className="form-label">Spaces</label>
            <input
              type="number"
              className="form-control"
              value={data.additionalIncome.parking_spaces}
              onChange={(event) =>
                onUpdate('additionalIncome', 'parking_spaces', Number(event.target.value))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rate</label>
            <div className="input-group">
              <input
                type="number"
                value={data.additionalIncome.parking_rate}
                onChange={(event) =>
                  onUpdate('additionalIncome', 'parking_rate', Number(event.target.value))
                }
              />
              <span className="input-addon">$/Month</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Projected Revenue</label>
            <div className="form-control" style={{ background: 'var(--gray-100)' }}>
              {formatCurrency(data.additionalIncome.parking_spaces * data.additionalIncome.parking_rate * 12)}
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3 className="card-title">Other Income</h3>
          <div className="card-grid" style={{ gap: 16 }}>
            {data.additionalIncome.other_income.map((income, index) => (
              <div key={index} className="info-card" style={{ background: 'white', marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Label</label>
                  <input
                    className="form-control"
                    value={income.label}
                    onChange={handleIncomeChange(index, 'label')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <div className="input-group">
                    <input
                      type="number"
                      value={income.amount}
                      onChange={handleIncomeChange(index, 'amount')}
                    />
                    <span className="input-addon">USD</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={income.frequency}
                    onChange={handleIncomeChange(index, 'frequency')}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdditionalIncome;
