'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ValuationTab from '../../components/tabs/ValuationTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioValuationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);

  const activeTab = searchParams.get('tab') || 'sales';

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) =>
        activeTab === 'reconciliation' ? (
          <div className="studio-coming-soon">
            <div className="studio-coming-soon-icon">⚖️</div>
            <h2>Reconciliation</h2>
            <p className="text-muted">Coming soon. Reconciliation workflow will appear here.</p>
          </div>
        ) : (
          <ValuationTab project={project} initialTab={activeTab} />
        )
      }
    </StudioPageFrame>
  );
}
