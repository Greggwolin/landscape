'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
} from '@coreui/react';
import { IntakeFileRow } from './IntakeFileRow';
import { useIntakeStaging, type IntakeStagedFile, type IntakeIntent } from '@/hooks/useIntakeStaging';
import { useWorkbench } from '@/contexts/WorkbenchContext';
import { getAuthHeaders } from '@/lib/authHeaders';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const DEFAULT_DOC_TYPES = [
  { value: 'appraisal_report', label: 'Appraisal Report' },
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'lease_document', label: 'Lease Document' },
  { value: 'survey', label: 'Survey' },
  { value: 'title_document', label: 'Title Document' },
  { value: 'other', label: 'Other' },
];

export interface KnowledgeDoc {
  docId: number;
  docName: string;
  docType: string;
}

export interface UnifiedIntakeModalProps {
  visible: boolean;
  projectId: number;
  projectName?: string;
  workspaceId?: number;
  initialFiles?: File[];
  onClose: () => void;
  onProjectKnowledge?: (docs: KnowledgeDoc[]) => void;
  onPlatformKnowledge?: (docs: KnowledgeDoc[]) => void;
}


export const UnifiedIntakeModal: React.FC<UnifiedIntakeModalProps> = ({
  visible,
  projectId,
  projectName = 'Project',
  workspaceId,
  initialFiles = [],
  onClose,
  onProjectKnowledge,
  onPlatformKnowledge,
}) => {
  const staging = useIntakeStaging(projectId, workspaceId);
  const { files, addFiles: stageFiles, removeFile, setIntent: updateFileIntent, setAllIntent, uploadAll, reset, isUploading, readyCount, allDone: uploadComplete } = staging;
  const [docTypes, setDocTypes] = useState(DEFAULT_DOC_TYPES);
  const { openWorkbench } = useWorkbench();
  const initialFilesProcessed = useRef(false);

  // Initialize files from initialFiles prop — run analysis via hook
  useEffect(() => {
    if (visible && initialFiles.length > 0 && !initialFilesProcessed.current) {
      initialFilesProcessed.current = true;
      stageFiles(initialFiles);
    }
    if (!visible) {
      initialFilesProcessed.current = false;
    }
  }, [visible, initialFiles, stageFiles]);

  // Fetch project doc types from DMS template
  useEffect(() => {
    if (visible && projectId) {
      fetch(`${DJANGO_API_URL}/api/dms/projects/${projectId}/doc-types/`, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.doc_types) && data.doc_types.length > 0) {
            setDocTypes(data.doc_types.map((dt: { doc_type_name: string }) => ({ value: dt.doc_type_name, label: dt.doc_type_name })));
          }
        })
        .catch(() => setDocTypes(DEFAULT_DOC_TYPES));
    }
  }, [visible, projectId]);

  const handleUpload = async () => {
    const completedFiles = await uploadAll();

    // Dispatch per intent using the returned results (not stale state)
    const extractDocs = completedFiles.filter(
      (f) => f.intent === 'structured_ingestion' && f.docId
    );

    if (extractDocs.length > 0 && extractDocs[0].docId) {
      openWorkbench({
        docId: extractDocs[0].docId,
        docName: extractDocs[0].file.name,
        docType: extractDocs[0].docType,
        intakeUuid: `intake-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });

      // Fire extraction trigger
      fetch(
        `${DJANGO_API_URL}/api/knowledge/documents/${extractDocs[0].docId}/extract-batched/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ project_id: projectId }),
        }
      ).catch((err) => console.warn('[Intake] Extraction trigger failed:', err));
    }

    // Collect knowledge docs for callbacks
    const projectKnowledgeDocs: KnowledgeDoc[] = completedFiles
      .filter((f) => f.intent === 'project_knowledge' && f.docId)
      .map((f) => ({ docId: f.docId!, docName: f.file.name, docType: f.docType }));

    const platformKnowledgeDocs: KnowledgeDoc[] = completedFiles
      .filter((f) => f.intent === 'platform_knowledge' && f.docId)
      .map((f) => ({ docId: f.docId!, docName: f.file.name, docType: f.docType }));

    // Fire knowledge callbacks — these open the metadata modals in ProjectLayoutClient
    if (projectKnowledgeDocs.length > 0 && onProjectKnowledge) {
      onProjectKnowledge(projectKnowledgeDocs);
    }
    if (platformKnowledgeDocs.length > 0 && onPlatformKnowledge) {
      onPlatformKnowledge(platformKnowledgeDocs);
    }

    // Auto-close intake modal if knowledge modals will open (so they're not stacked)
    if (projectKnowledgeDocs.length > 0 || platformKnowledgeDocs.length > 0 || extractDocs.length > 0) {
      handleClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fileCount = files.length;
  const completedCount = files.filter((f) => f.status === 'complete').length;
  const structuredCount = files.filter(
    (f) => f.intent === 'structured_ingestion'
  ).length;
  const projectKnowCount = files.filter(
    (f) => f.intent === 'project_knowledge'
  ).length;
  const platformKnowCount = files.filter(
    (f) => f.intent === 'platform_knowledge'
  ).length;
  const isReadyForUpload = files.length > 0 && files.every((f) => f.intent !== null && f.status !== 'error');

  const showBatchBar = fileCount > 1 && !uploadComplete;

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      alignment="center"
      size="lg"
      backdrop="static"
      keyboard={false}
    >
      <CModalHeader style={{ borderBottomColor: 'var(--cui-border-color)' }}>
        <CModalTitle>Upload Documents to {projectName}</CModalTitle>
      </CModalHeader>

      <CModalBody style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Header Info */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--cui-secondary)' }}>
            {fileCount} file{fileCount !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Batch Bar */}
        {showBatchBar && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--cui-gray-800)',
              borderRadius: '0.375rem',
              borderLeft: '3px solid var(--cui-info)',
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                marginBottom: '0.75rem',
                fontWeight: 500,
              }}
            >
              Set all to:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <CButton
                color="info"
                size="sm"
                variant="outline"
                onClick={() => setAllIntent('structured_ingestion')}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                }}
              >
                Structured Extract
              </CButton>
              <CButton
                color="success"
                size="sm"
                variant="outline"
                onClick={() => setAllIntent('project_knowledge')}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                }}
              >
                Project Knowledge
              </CButton>
              <CButton
                color="warning"
                size="sm"
                variant="outline"
                onClick={() => setAllIntent('platform_knowledge')}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                }}
              >
                Platform Knowledge
              </CButton>
            </div>

            {/* Destination Summary Pills */}
            {(structuredCount > 0 ||
              projectKnowCount > 0 ||
              platformKnowCount > 0) && (
              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {structuredCount > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: 'var(--cui-info)',
                      color: 'white',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {structuredCount} → Extract
                  </span>
                )}
                {projectKnowCount > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: 'var(--cui-success)',
                      color: 'white',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {projectKnowCount} → Project
                  </span>
                )}
                {platformKnowCount > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: 'var(--cui-warning)',
                      color: 'white',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {platformKnowCount} → Platform
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Column Headers */}
        {fileCount > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px',
              gap: '1rem',
              padding: '0.75rem 0',
              borderBottomColor: 'var(--cui-border-color)',
              borderBottomWidth: '1px',
              marginBottom: '0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--cui-secondary)',
              textTransform: 'uppercase',
            }}
          >
            <div>File Name</div>
            <div>Doc Type</div>
            <div>Intent</div>
          </div>
        )}

        {/* File List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {files.map((file) => (
            <IntakeFileRow
              key={file.id}
              file={file}
              onSetIntent={(id: string, intent: IntakeIntent) => updateFileIntent(id, intent)}
              onRemove={(id: string) => removeFile(id)}
            />
          ))}
        </div>

        {fileCount === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--cui-secondary)',
            }}
          >
            <p>No files selected</p>
          </div>
        )}
      </CModalBody>

      <CModalFooter
        style={{
          borderTopColor: 'var(--cui-border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Legend */}
        {!uploadComplete && fileCount > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.75rem',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--cui-info)',
                }}
              />
              <span>Extract</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--cui-success)',
                }}
              />
              <span>Project</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--cui-warning)',
                }}
              />
              <span>Platform</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
          <CButton
            color="secondary"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </CButton>

          {!uploadComplete ? (
            <CButton
              color="primary"
              onClick={handleUpload}
              disabled={!isReadyForUpload || isUploading}
            >
              {isUploading ? (
                <>
                  <CSpinner
                    size="sm"
                    className="me-2"
                    aria-hidden="true"
                  />
                  Uploading...
                </>
              ) : (
                `Upload ${fileCount} Document${fileCount !== 1 ? 's' : ''}`
              )}
            </CButton>
          ) : (
            <CButton color="primary" onClick={handleClose}>
              Done
            </CButton>
          )}
        </div>
      </CModalFooter>
    </CModal>
  );
};
