'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function WaterfallPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const router = useRouter();

  useEffect(() => {
    if (!projectId || Number.isNaN(projectId)) return;
    router.replace(`/projects/${projectId}/capitalization/equity`);
  }, [projectId, router]);

  return null;
}
