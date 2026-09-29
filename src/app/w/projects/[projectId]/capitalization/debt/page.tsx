'use client';

/**
 * The Debt screen on the chat-first surface, by its own address (board D-20).
 * Inside a chat the same screen opens in the panel's Screens view
 * (Capital → Debt) — see PanelScreenView.
 */

import { useRouter } from 'next/navigation';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { DebtScreen, type DebtScreenDestination } from '@/components/capitalization/DebtScreen';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperDebtPage() {
  const project = useWrapperProject();
  const router = useRouter();
  const base = `/w/projects/${project.project_id}`;

  const onNavigate = (to: DebtScreenDestination) => {
    // Equity and the cash flow are screens in the panel; the container a loan
    // funds opens Planning (Parcels) there too.
    const target =
      to === 'equity' ? 'folder=capital&tab=equity'
        : to === 'cashflow' ? 'folder=feasibility&tab=cashflow'
          : 'folder=property&tab=parcels';
    router.push(`${base}?view=screen&${target}`);
  };

  return (
    <RightContentPanel title="Debt" subtitle={project.project_name}>
      <div className="w-page-body" style={{ height: '100%' }}>
        <DebtScreen project={project} onNavigate={onNavigate} />
      </div>
    </RightContentPanel>
  );
}
