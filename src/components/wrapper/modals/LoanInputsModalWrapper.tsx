'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

// CapitalizationTab has activeSubTab prop: 'debt' | 'equity'
const CapitalizationTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/CapitalizationTab'),
  { ssr: false }
);

export function LoanInputsModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <CapitalizationTab project={project} activeSubTab="debt" />
    </div>
  );
}
