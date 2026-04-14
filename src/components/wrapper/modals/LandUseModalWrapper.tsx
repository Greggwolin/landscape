'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const LandUseTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/LandUseTab'),
  { ssr: false }
);

export function LandUseModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <LandUseTab project={project} />
    </div>
  );
}
