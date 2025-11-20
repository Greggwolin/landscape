import React from 'react';
import type { PropertyData } from '../types';

interface AssumptionsProps {
  data: PropertyData;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

const Assumptions: React.FC<AssumptionsProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Assumptions</h3>
      </div>
      <p className="helper-text">Basic assumptions tab - coming soon</p>
    </div>
  );
};

export default Assumptions;
