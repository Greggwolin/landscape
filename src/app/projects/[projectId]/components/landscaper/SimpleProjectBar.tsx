'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface SimpleProjectBarProps {
  projectId: number;
}

export function SimpleProjectBar({ projectId }: SimpleProjectBarProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  return (
    <div
      className="sticky top-0 z-40 border-b"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="font-semibold"
            style={{
              color: 'var(--cui-body-color)',
              fontSize: '1.1rem',
              whiteSpace: 'nowrap'
            }}
          >
            Active Project:
          </span>
          <select
            value={project?.project_id ?? projectId}
            onChange={(e) => handleProjectChange(Number(e.target.value))}
            className="px-3 py-2 font-medium rounded"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)',
              cursor: 'pointer',
              minWidth: '380px',
              fontSize: '1.05rem',
            }}
            disabled={!project}
          >
            {projects.length > 0 ? (
              projects.map((proj) => (
                <option key={proj.project_id} value={proj.project_id}>
                  {proj.project_name} - {proj.project_type_code || 'Unknown'}
                </option>
              ))
            ) : (
              <option value={projectId}>Loading...</option>
            )}
          </select>
        </div>
      </div>
    </div>
  );
}
