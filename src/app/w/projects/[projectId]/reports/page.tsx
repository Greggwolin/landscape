'use client';

import { PageShell } from '@/components/wrapper/PageShell';
import ReportsTab from '@/app/projects/[projectId]/components/tabs/ReportsTab';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperReportsPage() {
  const project = useWrapperProject();

  return (
    <PageShell
      title="Reports"
      subtitle={project.project_name}
      showChat
      chatPageContext="reports"
      projectId={project.project_id}
      hideHeader={true}
    >
      <ReportsTab project={project} />
    </PageShell>
  );
}
