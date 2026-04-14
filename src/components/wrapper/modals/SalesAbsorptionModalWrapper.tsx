'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const SalesTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/SalesTab'),
  { ssr: false }
);

export function SalesAbsorptionModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <SalesTab project={project} />
    </div>
  );
}
