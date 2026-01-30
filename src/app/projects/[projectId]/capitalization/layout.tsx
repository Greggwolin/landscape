'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import CapitalizationSubNav, {
  type CapitalizationSubNavOverride,
} from '@/components/capitalization/CapitalizationSubNav';

interface CapitalizationLayoutProps {
  children: React.ReactNode;
  subNavOverrides?: CapitalizationSubNavOverride;
}

export default function CapitalizationLayout({
  children,
  subNavOverrides,
}: CapitalizationLayoutProps) {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="min-h-screen">
      <CCard>
        <CCardHeader>
          <span>Capital Structure</span>
        </CCardHeader>
        <CapitalizationSubNav
          projectId={projectId}
          activeSubTab={subNavOverrides?.activeSubTab}
          onSubTabChange={subNavOverrides?.onSubTabChange}
        />
        <CCardBody>
          {children}
        </CCardBody>
      </CCard>
    </div>
  );
}
