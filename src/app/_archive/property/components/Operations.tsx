import React from 'react';
import type { PropertyData } from '../types';

interface OperationsProps {
  data: PropertyData;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

const Operations: React.FC<OperationsProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Operations</h3>
      </div>
      <p className="helper-text">Operations tab - coming soon</p>
    </div>
  );
};

export default Operations;
