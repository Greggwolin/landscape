'use client';

import React, { useCallback, useMemo, useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilLayers } from '@coreui/icons';
import { useDropzone } from 'react-dropzone';
import type { DMSDocument } from '@/types/dms';
import { useUploadThing } from '@/lib/uploadthing';
import { useLandscaperCollision } from '@/contexts/LandscaperCollisionContext';

export interface FilterAccordion {
  doc_type: string;
  icon: string;
  count: number;
  is_expanded: boolean;
  documents?: DMSDocument[];
}

import styles from './AccordionFilters.module.css';

interface UploadThingResult {
  url: string;
  key: string;
  name: string;
  size: number;
  serverData?: {
    storage_uri: string;
    sha256: string;
    doc_name: string;
    mime_type: string;
    file_size_bytes: number;
    project_id: number;
    workspace_id: number;
    doc_type: string;
    discipline?: string;
    phase_id?: number;
    parcel_id?: number;
  };
}

interface CollisionCheckResult {
  collision: boolean;
  match_type?: 'filename' | 'content' | 'both';
  existing_doc?: {
    doc_id: number;
    filename: string;
    version_number: number;
    uploaded_at: string;
    extraction_summary: {
      facts_extracted: number;
      embeddings: number;
    };
  };
}

// CollisionData type moved to LandscaperCollisionContext

/**
 * Compute real SHA-256 hash of file content
 */
async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check for collision with existing documents
 */
async function checkCollision(
  projectId: number,
  filename: string,
  contentHash: string
): Promise<CollisionCheckResult> {
  try {
    const response = await fetch(`/api/projects/${projectId}/dms/check-collision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        content_hash: contentHash
      })
    });

    if (!response.ok) {
      console.error('Collision check failed:', response.status);
      return { collision: false };
    }

    return response.json();
  } catch (error) {
    console.error('Collision check error:', error);
    return { collision: false };
  }
}

interface AccordionFiltersProps {
  projectId: number;
  workspaceId: number;
  filters: FilterAccordion[];
  onExpand: (docType: string) => void;
  onFilterClick?: (docType: string) => void; // Optional - kept for backwards compatibility
  onDocumentSelect: (doc: DMSDocument) => void;
  expandedFilter?: string | null;
  activeFilter?: string | null;
  onUploadComplete?: () => void;
  selectedDocIds?: Set<string>;
  onToggleDocSelection?: (docId: string) => void;
}

const acceptedFileTypes = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv']
};

interface FilterDropRowProps {
  filter: FilterAccordion;
  projectId: number;
  workspaceId: number;
  expandedFilter?: string | null;
  onExpand: (docType: string) => void;
  onDocumentSelect: (doc: DMSDocument) => void;
  onUploadComplete?: () => void;
  selectedDocIds?: Set<string>;
  onToggleDocSelection?: (docId: string) => void;
}

function FilterDropRow({
  filter,
  projectId,
  workspaceId,
  expandedFilter,
  onExpand,
  onDocumentSelect,
  onUploadComplete,
  selectedDocIds,
  onToggleDocSelection
}: FilterDropRowProps) {
  const [isUploading, setIsUploading] = useState(false);
  // pendingFiles stores remaining files when collision pauses processing
  // Will be used by collision resolution to continue the upload queue
  const [, setPendingFiles] = useState<File[]>([]);

  // Collision handling via Landscaper context
  const { addCollision, pendingCollision } = useLandscaperCollision();

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing('documentUploader', {
    headers: {
      'x-project-id': projectId.toString(),
      'x-workspace-id': workspaceId.toString(),
      'x-doc-type': filter.doc_type
    },
    onUploadError: (error) => {
      console.error('Filter upload error:', error);
      setIsUploading(false);
    }
  });

  /**
   * Upload a single file and create document record
   */
  const uploadSingleFile = useCallback(async (file: File, hash: string): Promise<void> => {
    const results = await startUpload([file]) as UploadThingResult[] | undefined;

    if (!results || results.length === 0) {
      throw new Error('No upload results returned');
    }

    const result = results[0];
    const serverData = result.serverData;

    const payload = {
      system: {
        project_id: serverData?.project_id ?? projectId,
        workspace_id: serverData?.workspace_id ?? workspaceId,
        doc_name: serverData?.doc_name ?? file.name,
        doc_type: serverData?.doc_type ?? filter.doc_type,
        status: 'draft',
        storage_uri: serverData?.storage_uri ?? result.url,
        sha256: hash,
        file_size_bytes: serverData?.file_size_bytes ?? file.size,
        mime_type: serverData?.mime_type ?? file.type,
        version_no: 1
      },
      profile: {},
      ai: { source: 'upload' }
    };

    const response = await fetch('/api/dms/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorData: unknown = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      console.error(
        `Failed to create document record for ${file.name}:`,
        {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        }
      );
    }
  }, [filter.doc_type, projectId, workspaceId, startUpload]);

  /**
   * Process files with collision detection - triggers Landscaper for collisions
   */
  const processFilesWithCollisionCheck = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setIsUploading(false);
      onUploadComplete?.();
      return;
    }

    const file = files[0];
    const remainingFiles = files.slice(1);

    try {
      // 1. Compute real content hash
      console.log(`Computing hash for: ${file.name}`);
      const contentHash = await computeFileHash(file);
      console.log(`Hash computed: ${contentHash.substring(0, 16)}...`);

      // 2. Check for collision
      console.log(`Checking collision for: ${file.name}`);
      const collision = await checkCollision(projectId, file.name, contentHash);
      console.log('Collision result:', collision);

      if (collision.collision && collision.existing_doc && collision.match_type) {
        // 3. Collision found - trigger Landscaper instead of modal
        addCollision({
          file,
          hash: contentHash,
          matchType: collision.match_type,
          existingDoc: {
            doc_id: collision.existing_doc.doc_id,
            filename: collision.existing_doc.filename,
            version_number: collision.existing_doc.version_number,
            uploaded_at: collision.existing_doc.uploaded_at,
          },
          projectId,
        });
        setPendingFiles(remainingFiles);
        // Don't proceed with upload - Landscaper will handle via context
        return;
      }

      // 4. No collision - proceed with upload
      await uploadSingleFile(file, contentHash);

      // 5. Continue with remaining files
      if (remainingFiles.length > 0) {
        await processFilesWithCollisionCheck(remainingFiles);
      } else {
        setIsUploading(false);
        onUploadComplete?.();
      }

    } catch (error) {
      console.error('Error processing file:', error);
      // Continue with remaining files despite error
      if (remainingFiles.length > 0) {
        await processFilesWithCollisionCheck(remainingFiles);
      } else {
        setIsUploading(false);
        onUploadComplete?.();
      }
    }
  }, [projectId, uploadSingleFile, onUploadComplete, addCollision]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    // Process files with collision detection
    await processFilesWithCollisionCheck(acceptedFiles);
  }, [processFilesWithCollisionCheck]);

  // Collision resolution is now handled by Landscaper via context
  // When user responds in Landscaper chat, the context will trigger the appropriate action

  const {
    getRootProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 32 * 1024 * 1024,
    maxFiles: 10,
    noClick: true,
    noKeyboard: true,
    disabled: isUploading || uploadThingUploading || !!pendingCollision
  });

  const isExpanded = expandedFilter === filter.doc_type;
  const headerDynamicStyle: React.CSSProperties = {
    backgroundColor: isExpanded ? 'var(--cui-primary-bg)' : 'var(--cui-body-bg)',
    borderBottomColor: isExpanded ? 'var(--cui-primary)' : 'var(--cui-border-color)',
    color: 'var(--cui-body-color)'
  };
  const mutedTextStyle: React.CSSProperties = {
    color: 'var(--cui-secondary-color)'
  };
  const nameStyle: React.CSSProperties = isExpanded
    ? {
        color: 'var(--cui-primary)',
        fontWeight: 600
      }
    : { color: 'var(--cui-body-color)' };

  const dropStateClass = isDragActive
    ? (isDragReject ? styles.filterRowReject : styles.filterRowActive)
    : '';

  return (
    <div key={filter.doc_type} style={{ backgroundColor: 'var(--cui-body-bg)' }}>
      <div
        {...getRootProps()}
        className={`flex items-center gap-1.5 px-3 py-1.25 transition-colors ${styles.filterRow} ${dropStateClass}`}
        style={{
          ...headerDynamicStyle,
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: headerDynamicStyle.borderBottomColor ?? 'var(--cui-border-color)'
        }}
        data-doc-type={filter.doc_type}
      >
        <button
          onClick={() => onExpand(filter.doc_type)}
          className="w-4 flex-shrink-0 transition-colors"
          style={mutedTextStyle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>

        <button
          onClick={() => onExpand(filter.doc_type)}
          className={`${styles.filterIconButton} ${isExpanded ? styles.filterIconButtonActive : ''}`}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${filter.doc_type}`}
        >
          <CIcon icon={cilLayers} className="w-5 h-5" />
        </button>

        <button
          onClick={() => onExpand(filter.doc_type)}
          className={`${styles.filterNameButton} ${isExpanded ? styles.filterNameButtonActive : ''}`}
          style={nameStyle}
          aria-expanded={isExpanded}
        >
          {filter.doc_type}
        </button>

        <span className="text-sm" style={mutedTextStyle}>
          ~{filter.count}
        </span>

        {isUploading || uploadThingUploading ? (
          <span className="text-xs" style={mutedTextStyle}>
            Uploading...
          </span>
        ) : (
          <button className="text-sm hover:underline" style={{ color: 'var(--cui-body-color)' }}>
            Edit
          </button>
        )}
      </div>

      {isExpanded && (
        <div
          className="px-4 py-2 space-y-1 border-t"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          {!filter.documents || filter.documents.length === 0 ? (
            <div className="text-sm italic py-2" style={mutedTextStyle}>
              {filter.count === 0 ? 'No documents' : 'Loading...'}
            </div>
          ) : (
            filter.documents.map((doc) => (
              <div
                key={doc.doc_id}
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors border-b last:border-b-0 hover:bg-opacity-50"
                style={{
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
                onClick={() => onDocumentSelect(doc)}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  style={{ borderColor: 'var(--cui-border-color)' }}
                  checked={selectedDocIds?.has(doc.doc_id) ?? false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleDocSelection?.(doc.doc_id)}
                />
                <span className="text-lg" style={{ color: 'var(--cui-danger)' }}>📄</span>
                <div className="flex-1 min-w-0" style={{ color: 'var(--cui-body-color)' }}>
                  <div className="font-medium truncate">
                    {doc.doc_name}
                  </div>
                  <div className="text-sm" style={mutedTextStyle}>
                    V{doc.version_no || 1} • {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    }) : 'No date'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Collision handling moved to Landscaper chat via LandscaperCollisionContext */}
    </div>
  );
}

export default function AccordionFilters({
  filters,
  onExpand,
  onDocumentSelect,
  expandedFilter,
  projectId,
  workspaceId,
  onUploadComplete,
  selectedDocIds,
  onToggleDocSelection
}: AccordionFiltersProps) {
  const renderedFilters = useMemo(() => filters, [filters]);

  return (
    <div className="divide-y" style={{ borderColor: 'var(--cui-border-color)' }}>
      {renderedFilters.map((filter) => (
        <FilterDropRow
          key={filter.doc_type}
          filter={filter}
          projectId={projectId}
          workspaceId={workspaceId}
          expandedFilter={expandedFilter}
          onExpand={onExpand}
          onDocumentSelect={onDocumentSelect}
          onUploadComplete={onUploadComplete}
          selectedDocIds={selectedDocIds}
          onToggleDocSelection={onToggleDocSelection}
        />
      ))}
    </div>
  );
}
