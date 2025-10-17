import React from 'react';
import type { PropertyData } from '../types';

interface FinancialProps {
  data: PropertyData;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

const Financial: React.FC<FinancialProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Financial Assumptions</h3>
      </div>
      <p className="helper-text">Financial assumptions tab - coming soon</p>
    </div>
  );
};

export default Financial;
