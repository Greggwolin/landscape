'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

/**
 * Legacy per-project documents route — preserved as a redirect.
 *
 * The dedicated documents page was removed in the right-panel toggle work
 * (chat qm, May 2026). Per-project documents now render inside the right
 * panel of the project workspace via the Artifacts | Documents toggle.
 *
 * This page redirects any cached /w/projects/[id]/documents URLs to the
 * project root and pre-selects the Documents view in the right panel so
 * users land where they expected.
 */
export default function WrapperDocumentsRedirect() {
  const params = useParams();
  const router = useRouter();
  const { setProjectRightPanelView } = useWrapperUI();
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    if (!projectId) return;
    setProjectRightPanelView('documents');
    router.replace(`/w/projects/${projectId}`);
  }, [projectId, router, setProjectRightPanelView]);

  return null;
}
