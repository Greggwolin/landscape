'use client';

import React, { useCallback, useRef, useState } from 'react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { DocumentsPanel } from '@/components/wrapper/documents/DocumentsPanel';
import { MediaPanel } from '@/components/wrapper/documents/MediaPanel';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import {
  UploadStagingProvider,
  useUploadStaging,
} from '@/contexts/UploadStagingContext';
import StagingTray from '@/components/dms/staging/StagingTray';
import IntakeChoiceModal from '@/components/intelligence/IntakeChoiceModal';

export default function WrapperDocumentsPage() {
  const project = useWrapperProject();
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // key={project_id} forces UploadStagingProvider (and the useUploadThing
  // hook inside it) to remount when the user navigates between projects.
  // Without this, the x-project-id header captured at first mount stays
  // pinned. Mirrors the guard in DMSView.tsx.
  return (
    <UploadStagingProvider
      key={project.project_id}
      projectId={project.project_id}
      workspaceId={1}
      onUploadComplete={bumpRefresh}
    >
      <WrapperDocumentsPageInner refreshKey={refreshKey} onChange={bumpRefresh} />
    </UploadStagingProvider>
  );
}

function WrapperDocumentsPageInner({
  refreshKey,
  onChange,
}: {
  refreshKey: number;
  onChange: () => void;
}) {
  const project = useWrapperProject();
  const { stageFiles, pendingIntakeDocs, clearPendingIntakeDocs } = useUploadStaging();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        stageFiles(files);
      }
      // reset so selecting the same file again re-triggers onChange
      e.target.value = '';
    },
    [stageFiles]
  );

  const actions = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
      />
      <button className="wrapper-btn wrapper-btn-primary" onClick={handleUploadClick}>
        Upload New
      </button>
    </>
  );

  return (
    <RightContentPanel title="Documents & Media" subtitle={project.project_name} actions={actions}>
      <div className="w-page-body">
        <DocumentsPanel refreshKey={refreshKey} onChange={onChange} />
        <MediaPanel />
      </div>

      <StagingTray />

      <IntakeChoiceModal
        visible={pendingIntakeDocs.length > 0}
        projectId={project.project_id}
        docs={pendingIntakeDocs}
        onClose={() => {
          clearPendingIntakeDocs();
          onChange();
        }}
      />
    </RightContentPanel>
  );
}
