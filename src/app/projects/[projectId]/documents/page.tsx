'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import DMSView from '@/components/dms/DMSView';
import { useProjectContext } from '@/app/components/ProjectProvider';

export default function ProjectDocumentsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, isLoading } = useProjectContext();

  const project = useMemo(
    () => projects.find((p) => p.project_id === projectId),
    [projects, projectId]
  );

  if (Number.isNaN(projectId)) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
        Invalid project id.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
        Loading project documents...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>
            Project not found
          </div>
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            We could not load project #{projectId}. Please select a valid project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#E6E7EB' }}>
      <div className="flex-1 min-h-0">
        <DMSView
          projectId={project.project_id}
          projectName={project.project_name}
          projectType={project.project_type || project.project_type_code || null}
        />
      </div>
    </div>
  );
}
