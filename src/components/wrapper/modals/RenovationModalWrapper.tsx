'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const RenovationSubTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/RenovationSubTab'),
  { ssr: false }
);

export function RenovationModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <RenovationSubTab project={project} />
    </div>
  );
}
