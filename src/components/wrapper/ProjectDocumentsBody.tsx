'use client';

import React, { useCallback, useRef, useState } from 'react';
import { DocumentsPanel } from '@/components/wrapper/documents/DocumentsPanel';
import { MediaPanel } from '@/components/wrapper/documents/MediaPanel';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import {
  UploadStagingProvider,
  useUploadStaging,
} from '@/contexts/UploadStagingContext';
import StagingTray from '@/components/dms/staging/StagingTray';
import IntakeChoiceModal from '@/components/intelligence/IntakeChoiceModal';

/**
 * Panel-sized per-project document management surface.
 *
 * Renders inside the right panel when `projectRightPanelView === 'documents'`.
 * Replaces the previously dedicated /w/projects/[id]/documents page so users
 * can flip between artifacts and documents without losing the active chat
 * thread or navigating away.
 *
 * Owns:
 *   - UploadStagingProvider (scoped to current project)
 *   - DocumentsPanel (project doc-type tree + bulk actions)
 *   - MediaPanel (project images/charts/renders)
 *   - StagingTray + IntakeChoiceModal (upload flow)
 *   - Upload toolbar with "Upload New" entry point
 */
export function ProjectDocumentsBody() {
  const project = useWrapperProject();
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // key={project_id} forces remount when the active project changes so the
  // x-project-id header captured at first mount of UploadStagingProvider's
  // useUploadThing hook stays in sync. Mirrors the legacy DMSView guard.
  return (
    <UploadStagingProvider
      key={project.project_id}
      projectId={project.project_id}
      workspaceId={1}
      onUploadComplete={bumpRefresh}
    >
      <ProjectDocumentsBodyInner refreshKey={refreshKey} onChange={bumpRefresh} />
    </UploadStagingProvider>
  );
}

function ProjectDocumentsBodyInner({
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

  return (
    <>
      <div className="project-docs-toolbar">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
        <button
          type="button"
          className="w-btn w-btn-ghost w-btn-sm"
          onClick={handleUploadClick}
        >
          + Upload New
        </button>
      </div>

      <div className="project-docs-body">
        <DocumentsPanel refreshKey={refreshKey} onChange={onChange} />
        <MediaPanel projectId={project.project_id} />
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
    </>
  );
}

export default ProjectDocumentsBody;
