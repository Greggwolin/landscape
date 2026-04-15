'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Project root — redirects to Documents by default.
 * The wrapper layout's CenterChatPanel handles the Landscaper chat on the left.
 */
export default function WrapperProjectRootPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId;

  useEffect(() => {
    if (projectId) router.replace(`/w/projects/${projectId}/documents`);
  }, [projectId, router]);

  return null;
}
