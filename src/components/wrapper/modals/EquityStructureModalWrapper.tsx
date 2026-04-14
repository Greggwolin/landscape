'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const CapitalizationTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/CapitalizationTab'),
  { ssr: false }
);

export function EquityStructureModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <CapitalizationTab project={project} activeSubTab="equity" />
    </div>
  );
}
