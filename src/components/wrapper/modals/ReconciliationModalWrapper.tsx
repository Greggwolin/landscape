'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

// ValuationTab has an activeTab prop that selects sub-tabs:
// 'sales-comparison', 'cost', 'income', 'reconciliation'
const ValuationTab = dynamic(
  () => import('@/app/projects/[projectId]/components/tabs/ValuationTab'),
  { ssr: false }
);

export function ReconciliationModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ height: 'calc(100vh - 160px)', overflow: 'auto' }}>
      <ValuationTab project={project} activeTab="reconciliation" />
    </div>
  );
}
