'use client';

import dynamic from 'next/dynamic';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

const LandscaperAdminPanel = dynamic(
  () => import('@/components/admin/LandscaperAdminPanel'),
  { ssr: false }
);

export default function WrapperLandscaperAIPage() {
  return (
    <RightContentPanel title="Landscaper AI">
      <div className="w-page-body">
        <LandscaperAdminPanel />
      </div>
    </RightContentPanel>
  );
}
