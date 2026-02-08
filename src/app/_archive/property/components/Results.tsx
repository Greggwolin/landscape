import React from 'react';
import type { PropertyData } from '../types';

interface ResultsProps {
  data: PropertyData;
}

const Results: React.FC<ResultsProps> = ({ data }) => {
  return (
    <div className="tab-content">
      <div className="section-header">
        <h3>Results</h3>
      </div>
      <p className="helper-text">Analysis results - coming soon</p>
    </div>
  );
};

export default Results;
