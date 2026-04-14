'use client';

import dynamic from 'next/dynamic';
import { PageShell } from '@/components/wrapper/PageShell';

const LandscaperAdminPanel = dynamic(
  () => import('@/components/admin/LandscaperAdminPanel'),
  { ssr: false }
);

export default function WrapperLandscaperAIPage() {
  return (
    <PageShell title="Landscaper AI">
      <LandscaperAdminPanel />
    </PageShell>
  );
}
