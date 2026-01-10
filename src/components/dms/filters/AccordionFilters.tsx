'use client';

import React, { useCallback, useMemo, useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilFilterSquare } from '@coreui/icons';
import { useDropzone } from 'react-dropzone';
import type { DMSDocument } from '@/types/dms';
import { useUploadThing } from '@/lib/uploadthing';

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
}

function FilterDropRow({
  filter,
  projectId,
  workspaceId,
  expandedFilter,
  onExpand,
  onDocumentSelect,
  onUploadComplete
}: FilterDropRowProps) {
  const [isUploading, setIsUploading] = useState(false);

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

  const generateSha256 = async (file: File, url: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(url + file.name + file.size + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    try {
      const results = await startUpload(acceptedFiles) as UploadThingResult[] | undefined;

      if (!results || results.length === 0) {
        throw new Error('No upload results returned');
      }

      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const file = acceptedFiles[index];
        const serverData = result.serverData;
        const sha256 = serverData?.sha256 || await generateSha256(file, result.url);

        const payload = {
          system: {
            project_id: serverData?.project_id ?? projectId,
            workspace_id: serverData?.workspace_id ?? workspaceId,
            doc_name: serverData?.doc_name ?? file.name,
            doc_type: serverData?.doc_type ?? filter.doc_type,
            status: 'draft',
            storage_uri: serverData?.storage_uri ?? result.url,
            sha256: sha256,
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
      }

      onUploadComplete?.();
    } catch (error) {
      console.error('Filter upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [filter.doc_type, onUploadComplete, projectId, workspaceId, startUpload]);

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
    disabled: isUploading || uploadThingUploading
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
          <CIcon icon={cilFilterSquare} className="w-6 h-6" />
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
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => {}}
                />
                <button
                  className="transition-colors"
                  style={mutedTextStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Toggle star
                  }}
                >
                  ⭐
                </button>
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
  onUploadComplete
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
        />
      ))}
    </div>
  );
}
