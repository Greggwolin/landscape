import React from 'react';
import type { PropertyData } from '../types';

interface DocumentsProps {
  data: PropertyData;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

const Documents: React.FC<DocumentsProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Documents</h3>
      </div>
      <p className="helper-text">Document management tab - coming soon</p>
    </div>
  );
};

export default Documents;
