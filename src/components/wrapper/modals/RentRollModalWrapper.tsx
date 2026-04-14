'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const PropertyTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/PropertyTab'),
  { ssr: false }
);

export function RentRollModalWrapper({ project, onClose, context }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <PropertyTab project={project} activeTab="rent-roll" />
    </div>
  );
}
