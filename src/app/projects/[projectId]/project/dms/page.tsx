'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import DMSView from '@/components/dms/DMSView';

/**
 * Project DMS Page
 *
 * Document Management System integrated into the Project tab.
 * Provides document upload, organization, and management functionality.
 */
export default function ProjectDMSPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const { projects } = useProjectContext();

  const project = projects.find(p => p.project_id === projectId);

  if (!project) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-warning">Project not found</div>
      </div>
    );
  }

  return (
    <>
      <ProjectSubNav projectId={projectId} />
      <div className="h-full">
        <DMSView
          projectId={project.project_id}
          projectName={project.project_name}
          projectType={project.project_type ?? null}
          hideHeader={false}
          defaultTab="documents"
        />
      </div>
    </>
  );
}
