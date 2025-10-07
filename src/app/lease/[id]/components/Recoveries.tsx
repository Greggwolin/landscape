'use client';

import ToggleSwitch from '../../components/ToggleSwitch';
import type { LeaseData, RecoveryCategory } from '../../types';

interface RecoveriesProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const Recoveries: React.FC<RecoveriesProps> = ({ data, onUpdate }) => {
  const handleStructureChange = (value: string) => {
    onUpdate('recoveries', 'recovery_structure', value);
  };

  const handleCategoryToggle = (index: number) => (checked: boolean) => {
    const nextCategories = [...data.recoveries.categories];
    nextCategories[index] = {
      ...nextCategories[index],
      included: checked
    };
    onUpdate('recoveries', 'categories', nextCategories);
  };

  return (
    <div className="tab-section" id="recoveries">
      <div className="section-title">Recoveries</div>
      <div className="section-subtitle">Expense recovery structure and category allocations</div>

      <div className="info-card">
        <h3 className="card-title">Recovery Structure</h3>
        <div className="card-grid card-grid-2">
          <div className="form-group">
            <label className="form-label">Structure</label>
            <select
              className="form-select"
              value={data.recoveries.recovery_structure}
              onChange={(event) => handleStructureChange(event.target.value)}
            >
              <option value="None">None</option>
              <option value="Single Net">Single Net</option>
              <option value="Double Net">Double Net</option>
              <option value="Triple Net">Triple Net</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Expense Cap</label>
            <div className="input-group">
              <input
                type="number"
                value={data.recoveries.expense_cap_pct ?? 0}
                onChange={(event) => onUpdate('recoveries', 'expense_cap_pct', Number(event.target.value))}
              />
              <span className="input-addon">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="info-card" style={{ marginTop: 24 }}>
        <h3 className="card-title">Expense Categories</h3>
        <div className="card-grid card-grid-2">
          {data.recoveries.categories.map((category, index) => (
            <div key={category.name} className="info-card" style={{ background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{category.name}</div>
                <span className={`status-dot ${category.included ? 'completed' : ''}`} />
              </div>
              <ToggleSwitch
                checked={category.included}
                onChange={handleCategoryToggle(index)}
                label={category.included ? 'Included in recoveries' : 'Excluded'}
              />
              <div className="form-group">
                <label className="form-label">Basis</label>
                <select
                  className="form-select"
                  value={category.basis ?? 'Base Year'}
                  onChange={(event) => {
                    const next = [...data.recoveries.categories];
                    next[index] = {
                      ...next[index],
                      basis: event.target.value as RecoveryCategory['basis']
                    };
                    onUpdate('recoveries', 'categories', next);
                  }}
                >
                  <option value="Base Year">Base Year</option>
                  <option value="Stop">Stop</option>
                  <option value="Pro Rata">Pro Rata Share</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cap</label>
                <div className="input-group">
                  <input
                    type="number"
                    value={category.cap ?? 0}
                    onChange={(event) => {
                      const next = [...data.recoveries.categories];
                      next[index] = {
                        ...next[index],
                        cap: Number(event.target.value)
                      };
                      onUpdate('recoveries', 'categories', next);
                    }}
                  />
                  <span className="input-addon">$/SF</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recoveries;
