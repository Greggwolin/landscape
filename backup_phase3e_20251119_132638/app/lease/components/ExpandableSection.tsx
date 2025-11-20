'use client';

import { useState } from 'react';

interface ExpandableSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ title, defaultExpanded = false, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`expandable-section ${expanded ? 'expanded' : ''}`}>
      <div className="expandable-header" onClick={() => setExpanded((prev) => !prev)}>
        <h3>{title}</h3>
        <div className={`expand-icon ${expanded ? 'rotated' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      {expanded ? <div className="expandable-content">{children}</div> : null}
    </div>
  );
};

export default ExpandableSection;
