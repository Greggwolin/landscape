'use client';

import { useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

/**
 * Funnel: the chat-first /w/ project route now redirects into the studio shell
 * (LSCMD-STUDIO-PRIMARY-SHELL-0624-JB14). The studio is THE place you work a
 * project; /w/ remains for global/no-project surfaces (dashboard, chat, tools,
 * admin) and classic /projects/[id] stays as the separate modality.
 *
 * One redirect funnels every /w/projects/[id]* route into /studio/[id]:
 *   /w/projects/[id]            → /studio/[id]
 *   /w/projects/[id]/map        → /studio/[id]?folder=map
 *   /w/projects/[id]/reports    → /studio/[id]?folder=reports
 *   /w/projects/[id]/documents  → /studio/[id]?folder=documents
 * Existing query params (?thread, ?folder, ?tab) are preserved (merged — a path
 * folder is only added when no explicit ?folder is present).
 *
 * The old /w/ project view (this route's page/components) is left in place but
 * unreachable behind the redirect — removed in a later dead-code pass.
 */
const SUBPATH_TO_FOLDER: Record<string, string> = {
  map: 'map',
  reports: 'reports',
  documents: 'documents',
};

export default function WrapperProjectLayout() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  useEffect(() => {
    if (!pathname) return;
    const m = pathname.match(/^\/w\/projects\/[^/]+\/?(.*)$/);
    if (!m) return;
    const sub = (m[1] || '').split('/')[0];
    // Read the live query string directly (avoids a useSearchParams Suspense
    // boundary in this client layout); preserve everything, merge in the folder.
    const qp = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    if (sub && SUBPATH_TO_FOLDER[sub] && !qp.get('folder')) {
      qp.set('folder', SUBPATH_TO_FOLDER[sub]);
    }
    const qs = qp.toString();
    router.replace(`/studio/${projectId}${qs ? `?${qs}` : ''}`);
  }, [pathname, projectId, router]);

  // Redirecting — never mount the old /w/ project view.
  return null;
}
