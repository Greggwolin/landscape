import React from 'react';
import type { PropertyData } from '../types';

interface ReportsProps {
  data: PropertyData;
}

const Reports: React.FC<ReportsProps> = ({ data }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Reports</h3>
      </div>
      <p className="helper-text">Reports tab - coming soon</p>
    </div>
  );
};

export default Reports;
