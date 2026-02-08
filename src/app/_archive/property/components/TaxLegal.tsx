import React from 'react';
import type { PropertyData } from '../types';

interface TaxLegalProps {
  data: PropertyData;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

const TaxLegal: React.FC<TaxLegalProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Tax & Legal</h3>
      </div>
      <p className="helper-text">Tax & Legal tab - coming soon</p>
    </div>
  );
};

export default TaxLegal;
