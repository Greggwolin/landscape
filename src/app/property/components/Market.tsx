import React from 'react';
import type { PropertyData } from '../types';

interface MarketProps {
  data: PropertyData;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

const Market: React.FC<MarketProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Market Assumptions</h3>
      </div>
      <p className="helper-text">Market analysis tab - coming soon</p>
    </div>
  );
};

export default Market;
