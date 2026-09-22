'use client';

/**
 * PanelDocumentsView — the project's Documents, as a tab of the right panel.
 *
 * Rule 9 (D-2026-09-22-NAV-R9, Gregg "9a"): one Documents per project. Until
 * 2026-09-22 there were two — the full document screen (reached from the
 * sidebar tree, under Screens) and a smaller list behind the panel's Documents
 * tab. The tab now shows the full one: the same document screen the classic
 * surface, the studio and the Screens view render (ProjectContentRouter,
 * folder "documents"), with its two sub-screens, Documents and Intelligence.
 *
 * Which sub-screen is open lives in the address as `doctab`, so it is part of
 * the chat's remembered panel (Rule 2) and a Back step (Rule 8).
 *
 * Gated to the project surface by its caller, for the same reason as
 * PanelScreenView: useWrapperProject throws without a provider.
 */

import React, { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import ProjectContentRouter from '@/app/projects/[projectId]/ProjectContentRouter';

const SUB_SCREENS = [
  { id: 'all', label: 'Documents' },
  { id: 'intelligence', label: 'Intelligence' },
];

export function PanelDocumentsView() {
  const project = useWrapperProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const doctab = searchParams?.get('doctab') === 'intelligence' ? 'intelligence' : 'all';

  const go = useCallback(
    (folder: string, tab?: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (folder === 'documents') {
        params.set('view', 'documents');
        params.set('doctab', tab || 'all');
      } else if (folder === 'map') {
        params.set('view', 'map');
      } else {
        // A document screen linking onward to another screen.
        params.set('view', 'screen');
        params.set('folder', folder);
        if (tab) params.set('tab', tab);
        else params.delete('tab');
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routerProject = project as any;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        className="d-flex align-items-center gap-3"
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--cui-border-color)',
          flexShrink: 0,
          fontSize: 12,
        }}
      >
        {SUB_SCREENS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`prp-toggle-btn${doctab === t.id ? ' is-active' : ''}`}
            onClick={() => go('documents', t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="project-folder-content" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ProjectContentRouter
          project={routerProject}
          currentFolder="documents"
          currentTab={doctab}
          setFolderTab={go}
        />
      </div>
    </div>
  );
}

export default PanelDocumentsView;
