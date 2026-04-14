'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const ProjectTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/ProjectTab'),
  { ssr: false }
);

export function ProjectDetailsModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <ProjectTab project={project} />
    </div>
  );
}
