'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DocumentsFilesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string | undefined;

  useEffect(() => {
    if (projectId) {
      void router.replace(`/projects/${projectId}/documents`);
    }
  }, [projectId, router]);

  return (
    <div className="p-6 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
      Redirecting to project documents...
    </div>
  );
}
