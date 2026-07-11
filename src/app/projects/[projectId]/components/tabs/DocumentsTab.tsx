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
      {/* DMSView's root is `h-full` (height:100%), correct when it fills a whole
          pane on its own. Here it's stacked ABOVE the media gallery inside the
          flex-column right-panel scroll container, where h-full made it reserve
          a full pane of empty height and pushed Project Media far below the fold
          (LSCMD-STUDIO-FREEZE-0710-LN5). This host forces it to size to content
          so the gallery sits directly beneath it. */}
      <div className="dms-doc-tab-host">
        <DMSView
          projectId={project.project_id}
          projectName={project.project_name}
          projectType={project.project_type ?? null}
        />
      </div>
      <ProjectMediaGallery
        projectId={project.project_id}
        projectName={project.project_name}
      />
    </div>
  );
}
