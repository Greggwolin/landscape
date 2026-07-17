/**
 * Design Shell page — visual restyle of the Studio shell (Stage A).
 *
 *   /design/[projectId]?folder=property&tab=market
 *
 * Left two-level folder rail | center Landscaper chat | right routed content.
 * Same logic as /studio/[projectId]; presentation restyled via design.css.
 * Built side-by-side with /studio, classic /projects/[id], and the /w/ shell;
 * purely additive.
 */

'use client';

// useFolderNavigation + CenterChatPanel read useSearchParams.
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { DesignShell } from '@/components/design/DesignShell';

export default function DesignPage() {
  return (
    <Suspense
      fallback={
        <div className="design-shell">
          <div className="folder-content-placeholder" style={{ margin: 'auto' }}>
            <p>Loading…</p>
          </div>
        </div>
      }
    >
      <DesignShell />
    </Suspense>
  );
}
