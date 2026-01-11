'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import CapitalizationSubNav from '@/components/capitalization/CapitalizationSubNav';

interface CapitalizationLayoutProps {
  children: React.ReactNode;
}

export default function CapitalizationLayout({ children }: CapitalizationLayoutProps) {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="min-h-screen">
      <CCard>
        <CCardHeader>
          <span>Capital Structure</span>
        </CCardHeader>
        <CapitalizationSubNav projectId={projectId} />
        <CCardBody>
          {children}
        </CCardBody>
      </CCard>
    </div>
  );
}
