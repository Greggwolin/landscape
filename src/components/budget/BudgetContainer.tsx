'use client';

import { useState } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import BudgetGridTab from './BudgetGridTab';
import TimelineTab from './TimelineTab';
import AssumptionsTab from './AssumptionsTab';
import AnalysisTab from './AnalysisTab';

interface BudgetContainerProps {
  projectId: number;
}

export default function BudgetContainer({ projectId }: BudgetContainerProps) {
  const [activeSubTab, setActiveSubTab] = useState('grid');

  return (
    <CCard>
      <CCardBody>
        {/* Sub-tab navigation */}
        <div
          className="d-flex gap-3 mb-4 pb-2"
          style={{ borderBottom: '1px solid var(--cui-border-color)' }}
        >
          <button
            onClick={() => setActiveSubTab('grid')}
            className="btn btn-link text-decoration-none px-0"
            style={{
              color: activeSubTab === 'grid' ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
              borderBottom: activeSubTab === 'grid' ? '2px solid var(--cui-primary)' : '2px solid transparent',
              fontWeight: activeSubTab === 'grid' ? 600 : 400,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              paddingBottom: '0.5rem'
            }}
          >
            Budget Grid
          </button>
          <button
            onClick={() => setActiveSubTab('timeline')}
            className="btn btn-link text-decoration-none px-0"
            style={{
              color: activeSubTab === 'timeline' ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
              borderBottom: activeSubTab === 'timeline' ? '2px solid var(--cui-primary)' : '2px solid transparent',
              fontWeight: activeSubTab === 'timeline' ? 600 : 400,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              paddingBottom: '0.5rem'
            }}
          >
            Timeline View
          </button>
          <button
            onClick={() => setActiveSubTab('assumptions')}
            className="btn btn-link text-decoration-none px-0"
            style={{
              color: activeSubTab === 'assumptions' ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
              borderBottom: activeSubTab === 'assumptions' ? '2px solid var(--cui-primary)' : '2px solid transparent',
              fontWeight: activeSubTab === 'assumptions' ? 600 : 400,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              paddingBottom: '0.5rem'
            }}
          >
            Assumptions
          </button>
          <button
            onClick={() => setActiveSubTab('analysis')}
            className="btn btn-link text-decoration-none px-0"
            style={{
              color: activeSubTab === 'analysis' ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
              borderBottom: activeSubTab === 'analysis' ? '2px solid var(--cui-primary)' : '2px solid transparent',
              fontWeight: activeSubTab === 'analysis' ? 600 : 400,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              paddingBottom: '0.5rem'
            }}
          >
            Analysis
          </button>
        </div>

        {/* Content area */}
        <div className="tab-content">
          {activeSubTab === 'grid' && <BudgetGridTab projectId={projectId} />}
          {activeSubTab === 'timeline' && <TimelineTab projectId={projectId} />}
          {activeSubTab === 'assumptions' && <AssumptionsTab projectId={projectId} />}
          {activeSubTab === 'analysis' && <AnalysisTab projectId={projectId} />}
        </div>
      </CCardBody>
    </CCard>
  );
}
