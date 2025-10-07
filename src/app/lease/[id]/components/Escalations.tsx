'use client';

import type { LeaseData } from '../../types';

interface EscalationsProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const Escalations: React.FC<EscalationsProps> = ({ data, onUpdate }) => {
  const rule = data.escalations[0];

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field.toLowerCase().includes('pct') || field.toLowerCase().includes('amount') ? Number(event.target.value) : event.target.value;
    const next = [{ ...rule, [field]: value }];
    onUpdate('escalations', 'escalations', next);
  };

  const handleCheckbox = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = [{ ...rule, [field]: event.target.checked }];
    onUpdate('escalations', 'escalations', next);
  };

  return (
    <div className="tab-section">
      <div className="section-title">CPI Increases</div>
      <div className="section-subtitle">Configure CPI timing, caps, and reset options</div>

      <div className="form-grid form-grid-3" style={{ marginTop: 20 }}>
        <div className="form-group">
          <label className="form-label">CPI Timing</label>
          <select className="form-select" value={rule?.escalation_frequency ?? 'None'} onChange={handleChange('escalation_frequency')}>
            <option value="None">None</option>
            <option value="Annual">Each Calendar Year</option>
            <option value="Lease Anniversary">Each Lease Anniversary</option>
            <option value="Mid-Term">At Mid-Lease</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Inflation Rate/Index</label>
          <select className="form-select" value={rule?.cpi_index ?? 'CPI Inflation Rate'} onChange={handleChange('cpi_index')}>
            <option value="None">No Inflation Rate</option>
            <option value="General">General Inflation Rate</option>
            <option value="Market">Market Inflation Rate</option>
            <option value="Expense">Expense Inflation Rate</option>
            <option value="CPI Inflation Rate">CPI Inflation Rate</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tenant&apos;s Share of CPI</label>
          <div className="input-group">
            <input
              type="number"
              value={rule?.tenant_cpi_share_pct ?? 100}
              onChange={handleChange('tenant_cpi_share_pct')}
            />
            <span className="input-addon">%</span>
          </div>
        </div>
      </div>

      <div className="form-grid form-grid-3" style={{ marginTop: 20 }}>
        <div className="form-group">
          <label className="form-label">First Increase Date</label>
          <input
            type="date"
            className="form-control"
            value={rule?.first_escalation_date ?? ''}
            onChange={handleChange('first_escalation_date')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Months Between Increases</label>
          <input type="number" className="form-control" value={12} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Current Monthly CPI</label>
          <div className="input-group">
            <span className="input-addon">$</span>
            <input type="number" value={0} onChange={() => undefined} />
          </div>
        </div>
      </div>

      <div className="subsection-title" style={{ marginTop: 28 }}>CPI Caps & Floors</div>
      <div className="form-grid form-grid-4">
        <div className="form-group">
          <label className="form-label">Minimum Increase</label>
          <div className="input-group">
            <input type="number" value={rule?.cpi_floor_pct ?? 0} onChange={handleChange('cpi_floor_pct')} />
            <span className="input-addon">%</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Maximum Increase</label>
          <div className="input-group">
            <input type="number" value={rule?.cpi_cap_pct ?? 5} onChange={handleChange('cpi_cap_pct')} />
            <span className="input-addon">%</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cumulative Cap</label>
          <div className="input-group">
            <input type="number" value={rule?.escalation_pct ?? 0} onChange={handleChange('escalation_pct')} />
            <span className="input-addon">%</span>
          </div>
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
            <input type="checkbox" checked={rule?.compound_escalation ?? false} onChange={handleCheckbox('compound_escalation')} />
            <span>Compounding</span>
          </label>
        </div>
      </div>

      <div className="subsection-title" style={{ marginTop: 28 }}>CPI Index Value Override</div>
      <div className="form-grid form-grid-3">
        <div className="form-group">
          <label className="form-label">Override Type</label>
          <select className="form-select" value={rule?.escalation_type ?? 'Fixed Percentage'} onChange={handleChange('escalation_type')}>
            <option value="None">None</option>
            <option value="Use Value on a Date">Use Value on a Date</option>
            <option value="Use Specified Value">Use Specified Value</option>
            <option value="Use Months Offset Value">Use Months Offset Value</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">CPI Start Value Date</label>
          <input type="date" className="form-control" value={rule?.first_escalation_date ?? ''} onChange={handleChange('first_escalation_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">CPI Specified Start Value</label>
          <input type="number" className="form-control" value={rule?.annual_increase_amount ?? 0} onChange={handleChange('annual_increase_amount')} />
        </div>
      </div>

      <div className="subsection-title" style={{ marginTop: 28 }}>Reset CPI Options</div>
      <div className="form-grid form-grid-3">
        <div className="form-group">
          <label className="form-label">Reset CPI on Changes to Base Rent</label>
          <select className="form-select">
            <option>None</option>
            <option>Rent Review</option>
            <option>Outstanding Review</option>
            <option>Base Rent Change</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Rent for CPI Increases</label>
          <select className="form-select">
            <option>Rent in Prior 12 Months</option>
            <option>Rent at Time of Increase</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Escalations;
