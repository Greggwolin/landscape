'use client';

import React, { useCallback, useRef, useState } from 'react';
import { DocumentsPanel } from '@/components/wrapper/documents/DocumentsPanel';
import { MediaPanel } from '@/components/wrapper/documents/MediaPanel';
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
 *
 * Takes `projectId` as a prop rather than reading WrapperProjectContext: this
 * panel mounts inside ProjectArtifactsPanel, which renders on the /w/ routes
 * where no WrapperProjectProvider exists (only /studio/[projectId] mounts one).
 * Reading the context here threw on every Documents click from /w/.
 */
export function ProjectDocumentsBody({ projectId }: { projectId: number }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // key={projectId} forces remount when the active project changes so the
  // x-project-id header captured at first mount of UploadStagingProvider's
  // useUploadThing hook stays in sync. Mirrors the legacy DMSView guard.
  return (
    <UploadStagingProvider
      key={projectId}
      projectId={projectId}
      workspaceId={1}
      onUploadComplete={bumpRefresh}
    >
      <ProjectDocumentsBodyInner
        projectId={projectId}
        refreshKey={refreshKey}
        onChange={bumpRefresh}
      />
    </UploadStagingProvider>
  );
}

function ProjectDocumentsBodyInner({
  projectId,
  refreshKey,
  onChange,
}: {
  projectId: number;
  refreshKey: number;
  onChange: () => void;
}) {
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
        {/* FB-287: solid button treatment — the ghost variant read as a bare
            text link; the upload entry point should look like a button. */}
        <button
          type="button"
          className="w-btn w-btn-primary w-btn-sm"
          onClick={handleUploadClick}
        >
          + Upload New
        </button>
      </div>

      <div className="project-docs-body">
        <DocumentsPanel projectId={projectId} refreshKey={refreshKey} onChange={onChange} />
        <MediaPanel projectId={projectId} />
      </div>

      <StagingTray />

      <IntakeChoiceModal
        visible={pendingIntakeDocs.length > 0}
        projectId={projectId}
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
