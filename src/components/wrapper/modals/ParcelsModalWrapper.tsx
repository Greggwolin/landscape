'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const ParcelsTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/ParcelsTab'),
  { ssr: false }
);

export function ParcelsModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <ParcelsTab project={project} />
    </div>
  );
}
