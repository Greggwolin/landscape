// Restored Header wrapper combining global and project navigation.
'use client';

import { useMemo } from 'react';
import TopNavigationBar from './TopNavigationBar';
import ProjectContextBar from './ProjectContextBar';
import { useProjectContext } from './ProjectProvider';

export default function Header() {
  const { activeProject } = useProjectContext();
  const projectId = useMemo(() => activeProject?.project_id, [activeProject]);

  return (
    <div className="flex flex-col w-full">
      <TopNavigationBar />
      {projectId ? <ProjectContextBar projectId={projectId} /> : null}
    </div>
  );
}
