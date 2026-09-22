'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy per-project map route — now a redirect to the panel's Map tab.
 *
 * Rule 9 (D-2026-09-22-NAV-R9, Gregg "9a"): one Map per project, and it is the
 * Map tab of the right panel. This route used to replace the whole right-hand
 * side with a second copy of the same map, and it is still what several
 * Landscaper tools and older links point at (plan extraction, site-plan drape
 * control, remembered chat destinations). Rather than change every caller,
 * the route forwards to the tab, carrying the chat and anything else in the
 * address. The map component drains any pending plan-extract or drape command
 * when it mounts in the tab, exactly as it did here.
 *
 * Replace, not push, so this address never becomes a Back step of its own.
 */
export default function WrapperMapRedirect() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string | undefined;

  useEffect(() => {
    if (!projectId) return;
    const qs = new URLSearchParams(searchParams?.toString() ?? '');
    qs.set('view', 'map');
    router.replace(`/w/projects/${projectId}?${qs.toString()}`);
  }, [projectId, router, searchParams]);

  return null;
}
