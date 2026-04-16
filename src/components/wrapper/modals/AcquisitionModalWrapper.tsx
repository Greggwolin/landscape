'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const AcquisitionSubTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/AcquisitionSubTab'),
  { ssr: false }
);

export function AcquisitionModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <AcquisitionSubTab project={project} />
    </div>
  );
}
