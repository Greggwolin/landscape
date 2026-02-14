'use client';

import { useParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { ICPage } from '@/components/ic/ICPage';

export default function InvestmentCommitteePage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, activeProject } = useProjectContext();

  const currentProject =
    projects.find((p) => p.project_id === projectId) || activeProject;

  const projectName = currentProject?.project_name || `Project ${projectId}`;

  return (
    <div style={{ height: 'calc(100vh - 56px)' }}>
      <ICPage
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
}
