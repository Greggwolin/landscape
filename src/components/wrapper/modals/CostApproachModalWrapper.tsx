'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const ValuationTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/ValuationTab'),
  { ssr: false }
);

export function CostApproachModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <ValuationTab project={project} activeTab="cost" />
    </div>
  );
}
