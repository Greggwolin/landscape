'use client';

import React from 'react';
import IngestionWorkbench from './tabs/IngestionWorkbench';
import type { FolderTab } from '@/lib/utils/folderTabConfig';
import '@/styles/ingestion-workbench.css';

interface Project {
  project_id: number;
  project_name: string;
  [key: string]: unknown;
}

interface IngestionWorkbenchPanelProps {
  projectId: number;
  project?: Project;
  /** Live folder config from useFolderNavigation */
  folders: FolderTab[];
  /** True for land development projects */
  isLandDev?: boolean;
  /** Source document ID — scopes field table to this document's extractions */
  docId?: number | null;
  /** Intake session UUID — scopes Landscaper chat thread */
  intakeUuid?: string | null;
  /** Name of the file being ingested */
  docName?: string | null;
  /** Detected document type */
  docType?: string | null;
  onClose: () => void;
}

/**
 * Floating non-modal panel that renders the IngestionWorkbench.
 * Mounted at the project layout level so it's accessible from any page.
 * Clicking outside (on the transparent backdrop) closes the panel.
 */
export default function IngestionWorkbenchPanel({
  projectId,
  project,
  folders,
  isLandDev = false,
  docId,
  intakeUuid,
  docName,
  docType,
  onClose,
}: IngestionWorkbenchPanelProps) {
  return (
    <>
      {/* Transparent backdrop — click to close */}
      <div className="wb-floating-backdrop" onClick={onClose} />

      {/* Floating panel */}
      <div className="wb-floating-panel">
        <IngestionWorkbench
          projectId={projectId}
          project={project}
          folders={folders}
          isLandDev={isLandDev}
          docId={docId}
          intakeUuid={intakeUuid}
          docName={docName}
          docType={docType}
          onClose={onClose}
        />
      </div>
    </>
  );
}
