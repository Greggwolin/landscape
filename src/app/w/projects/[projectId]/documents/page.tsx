'use client';

import { PageShell } from '@/components/wrapper/PageShell';
import DMSView from '@/components/dms/DMSView';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperDocumentsPage() {
  const project = useWrapperProject();

  return (
    <PageShell
      title="Documents"
      subtitle={project.project_name}
      showChat
      chatPageContext="documents"
      projectId={project.project_id}
      hideHeader={true}
    >
      <DMSView
        projectId={project.project_id}
        projectName={project.project_name}
        projectType={project.project_type_code || null}
      />
    </PageShell>
  );
}
