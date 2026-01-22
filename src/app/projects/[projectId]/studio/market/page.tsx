'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioMarketPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {() => (
        <div className="studio-coming-soon">
          <div className="studio-coming-soon-icon">📊</div>
          <h2>Market Analysis</h2>
          <p className="text-muted">Coming soon. Market comps and trends will appear here.</p>
        </div>
      )}
    </StudioPageFrame>
  );
}
