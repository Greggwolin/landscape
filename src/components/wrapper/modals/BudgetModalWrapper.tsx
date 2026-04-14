'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

const BudgetTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/BudgetTab'),
  { ssr: false }
);

export function BudgetModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <BudgetTab project={project} />
    </div>
  );
}
