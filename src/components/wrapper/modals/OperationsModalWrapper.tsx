'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const OperationsTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/OperationsTab'),
  { ssr: false }
);

export function OperationsModalWrapper({ project, onClose, context }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <OperationsTab project={project} />
    </div>
  );
}
