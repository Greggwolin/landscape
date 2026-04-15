'use client';

import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { DocumentsPanel } from '@/components/wrapper/documents/DocumentsPanel';
import { MediaPanel } from '@/components/wrapper/documents/MediaPanel';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperDocumentsPage() {
  const project = useWrapperProject();

  const actions = (
    <button className="wrapper-btn wrapper-btn-primary">Upload New</button>
  );

  return (
    <RightContentPanel title="Documents & Media" subtitle={project.project_name} actions={actions}>
      <div className="w-page-body">
        <DocumentsPanel />
        <MediaPanel />
      </div>
    </RightContentPanel>
  );
}
