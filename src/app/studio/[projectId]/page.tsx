/**
 * Studio Shell page — isolated three-zone project workspace.
 *
 *   /studio/[projectId]?folder=property&tab=market
 *
 * Left two-level folder rail | center Landscaper chat | right routed content.
 * Built side-by-side with classic /projects/[id] and the /w/ shell; additive.
 */

'use client';

// useFolderNavigation + CenterChatPanel read useSearchParams.
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { StudioShell } from '@/components/studio/StudioShell';

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="studio-shell">
          <div className="folder-content-placeholder" style={{ margin: 'auto' }}>
            <p>Loading…</p>
          </div>
        </div>
      }
    >
      <StudioShell />
    </Suspense>
  );
}
