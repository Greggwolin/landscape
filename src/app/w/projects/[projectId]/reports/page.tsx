'use client';

import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import ReportsTab from '@/app/projects/[projectId]/components/tabs/ReportsTab';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperReportsPage() {
  const project = useWrapperProject();

  return (
    <RightContentPanel title="Reports" subtitle={project.project_name}>
      <div className="w-page-body">
        <ReportsTab project={project} />
      </div>
    </RightContentPanel>
  );
}
