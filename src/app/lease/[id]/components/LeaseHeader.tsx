'use client';

import type { Lease } from '../../types';

interface LeaseHeaderProps {
  lease: Lease;
  saving: boolean;
}

const LeaseHeader: React.FC<LeaseHeaderProps> = ({ lease, saving }) => {
  return (
    <header className="page-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div>
          <h1>Lease Input</h1>
          <p>
            Property: Office Building – Suite {lease.suite_number ?? 'N/A'}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-outline-secondary">
            ◂ Back to Rent Roll
          </button>
          <button type="button" className="btn btn-primary">
            💾 Save
          </button>
          <button type="button" className="btn btn-success">
            ✅ {saving ? 'Saving…' : 'Save & Close'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default LeaseHeader;
