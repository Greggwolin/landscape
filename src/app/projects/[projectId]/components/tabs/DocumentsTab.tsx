'use client';

import React from 'react';
import DMSView from '@/components/dms/DMSView';
import ProjectMediaGallery from '@/components/dms/ProjectMediaGallery';

interface Project {
  project_id: number;
  project_name: string;
  project_type?: string | null;
}

interface DocumentsTabProps {
  project: Project;
}

export default function DocumentsTab({ project }: DocumentsTabProps) {
  return (
    <div>
      <DMSView
        projectId={project.project_id}
        projectName={project.project_name}
        projectType={project.project_type ?? null}
      />
      <ProjectMediaGallery
        projectId={project.project_id}
        projectName={project.project_name}
      />
    </div>
  );
}
