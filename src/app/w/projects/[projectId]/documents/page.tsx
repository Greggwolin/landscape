'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string | undefined;

  // 2026-09-22: the panel view now lives in the address (see
  // src/lib/wrapper/navMemory.ts), so the redirect says view=documents there
  // and carries the chat along, instead of setting it in memory and landing
  // on a bare project address.
  useEffect(() => {
    if (!projectId) return;
    const qs = new URLSearchParams(searchParams?.toString() ?? '');
    qs.set('view', 'documents');
    router.replace(`/w/projects/${projectId}?${qs.toString()}`);
  }, [projectId, router, searchParams]);

  return null;
}
